// Clinical Decision Simulator - Main JavaScript
class ClinicalSimulator {
    constructor() {
        this.scenarioData = null;
        this.currentNode = 'start';
        this.pathHistory = [];
        this.correctDecisions = 0;
        this.totalDecisions = 0;
        this.score = 0;
        this.currentReference = null;
    }

    loadScenario(scenarioData) {
        this.scenarioData = scenarioData;
        this.currentNode = 'start';
        this.pathHistory = [];
        this.correctDecisions = 0;
        this.totalDecisions = 0;
        this.score = 0;

        // Update title
        document.getElementById('scenarioTitle').textContent = scenarioData.metadata.title;

        // Update patient info
        const patient = scenarioData.initial_state.patient;
        document.getElementById('patientInfo').innerHTML = `
            <strong>Patient:</strong> ${patient.demographics}<br>
            <strong>Weight:</strong> ${patient.weight}<br>
            <strong>Diagnosis:</strong> ${patient.diagnosis}
        `;

        // Update initial vitals
        this.updateVitals(scenarioData.initial_state.vitals);
    }

    getCurrentNode() {
        return this.scenarioData.nodes[this.currentNode];
    }

    makeDecision(decisionId) {
        const node = this.getCurrentNode();
        const decision = node.decisions.find(d => d.id === decisionId);

        if (!decision) return null;

        const nextNode = this.scenarioData.nodes[decision.next];

        // Record decision
        this.pathHistory.push({
            nodeId: decision.next,
            nodeTitle: nextNode.title || decision.text,
            decision: decision.text,
            result: nextNode.result || 'neutral',
            feedback: nextNode.feedback,
            reference: nextNode.reference
        });

        // Update tracking
        this.totalDecisions++;
        if (nextNode.result === 'correct') {
            this.correctDecisions++;
        }

        // Handle scoring
        if (nextNode.points) {
            this.score += nextNode.points;
        }

        // Prepare result
        const result = {
            type: nextNode.type,
            result: nextNode.result,
            feedback: nextNode.feedback,
            reference: nextNode.reference,
            points: nextNode.points || 0,
            nextNodeId: decision.next,
            actualNextNode: nextNode.next
        };

        // Update current node for scenario types
        if (nextNode.type === 'scenario') {
            this.currentNode = decision.next;
        }

        return result;
    }

    updateVitals(vitals) {
        if (vitals.bp) {
            document.getElementById('vitalBP').textContent = vitals.bp.value;
            document.getElementById('vitalBP').className = vitals.bp.critical ? 'vital-value vital-critical' : 'vital-value vital-normal';
        }
        if (vitals.spo2) {
            document.getElementById('vitalSpO2').textContent = vitals.spo2.value;
            document.getElementById('vitalSpO2').className = vitals.spo2.critical ? 'vital-value vital-critical' : 'vital-value vital-normal';
        }
        if (vitals.ph) {
            document.getElementById('vitalPH').textContent = vitals.ph.value;
            document.getElementById('vitalPH').className = vitals.ph.critical ? 'vital-value vital-critical' : 'vital-value vital-normal';
        }
        if (vitals.inr) {
            document.getElementById('vitalINR').textContent = vitals.inr.value;
            document.getElementById('vitalINR').className = vitals.inr.critical ? 'vital-value vital-warning' : 'vital-value vital-normal';
        }
    }
}

// UI Controller
class SimulatorUI {
    constructor() {
        this.simulator = new ClinicalSimulator();
        this.feedbackCallback = null;
    }

    async init() {
        try {
            // Get scenario ID from URL parameter or window variable
            const scenarioId = window.currentScenarioId || 'liver-failure';

            // Load scenario data
            const response = await fetch(`scenarios/${scenarioId}.json`);
            if (!response.ok) {
                throw new Error(`Failed to load scenario: ${scenarioId}`);
            }

            const scenarioData = await response.json();
            this.simulator.loadScenario(scenarioData);
            this.updateDisplay();

            // Hide loading screen
            setTimeout(() => {
                document.getElementById('loadingScreen').style.opacity = '0';
                setTimeout(() => {
                    document.getElementById('loadingScreen').style.display = 'none';
                    document.getElementById('simulatorContainer').style.display = 'flex';
                }, 500);
            }, 1000);
        } catch (error) {
            console.error('Error loading scenario:', error);
            alert('Failed to load scenario. Redirecting to menu...');
            window.location.href = 'scenario-menu.html';
        }
    }

    updateDisplay() {
        const node = this.simulator.getCurrentNode();

        if (!node) return;

        // Handle different node types
        switch (node.type) {
            case 'scenario':
                this.displayScenario(node);
                break;
            case 'completion':
                this.displayCompletion(node);
                break;
        }

        // Update scores
        this.updateScores();

        // Update path history
        this.updatePathHistory();
    }

    displayScenario(node) {
        // Update title and content
        document.getElementById('statusTitle').textContent = node.title || 'Clinical Situation';
        document.getElementById('currentSituation').innerHTML = node.content.replace(/\n/g, '<br>');

        // Update vitals if specified
        if (node.vitals_update) {
            this.simulator.updateVitals(node.vitals_update);
        }

        // Display decisions
        const container = document.getElementById('decisionsContainer');
        container.innerHTML = '';

        if (node.decisions && node.decisions.length > 0) {
            node.decisions.forEach((decision, index) => {
                const button = document.createElement('div');
                button.className = 'decision-button';
                button.innerHTML = `
                    <div class="decision-label">Option ${index + 1}</div>
                    <div class="decision-text">${decision.text}</div>
                `;
                button.onclick = () => this.makeDecision(decision.id);
                container.appendChild(button);
            });
        }
    }

    async makeDecision(decisionId) {
        const result = this.simulator.makeDecision(decisionId);

        if (!result) return;

        // Show feedback
        await this.showFeedback(result);

        // Handle next action
        if (result.type === 'outcome') {
            // For outcome nodes, move to the next node
            if (result.actualNextNode) {
                this.simulator.currentNode = result.actualNextNode;
                this.updateDisplay();
            }
        } else if (result.type === 'scenario') {
            // For scenario nodes, we're already at the next node
            this.updateDisplay();
        } else if (result.type === 'completion') {
            // Show completion
            this.simulator.currentNode = result.nextNodeId;
            this.updateDisplay();
        }
    }

    showFeedback(result) {
        return new Promise((resolve) => {
            const modal = document.getElementById('feedbackModal');
            const header = document.getElementById('feedbackHeader');
            const text = document.getElementById('feedbackText');
            const refBox = document.getElementById('referenceBox');
            const refText = document.getElementById('referenceText');
            const points = document.getElementById('outcomePoints');

            // Set feedback content
            let icon, className, title;
            if (result.result === 'correct') {
                icon = '✅';
                className = 'feedback-correct';
                title = 'Correct Decision!';
            } else if (result.result === 'partial') {
                icon = '⚠️';
                className = 'feedback-partial';
                title = 'Partially Correct';
            } else {
                icon = '❌';
                className = 'feedback-incorrect';
                title = 'Incorrect Decision';
            }

            header.className = `feedback-header ${className}`;
            header.innerHTML = `<span class="feedback-icon">${icon}</span> ${title}`;
            text.textContent = result.feedback || '';

            // Show reference if available
            if (result.reference && this.simulator.scenarioData.references &&
                this.simulator.scenarioData.references[result.reference]) {
                refBox.style.display = 'block';
                refText.textContent = result.reference;
                this.simulator.currentReference = result.reference;
            } else {
                refBox.style.display = 'none';
            }

            // Show points
            points.innerHTML = `Points earned: <strong>${result.points}</strong>`;

            // Set up continue callback
            this.feedbackCallback = () => {
                modal.style.display = 'none';
                resolve();
            };

            // Show modal
            modal.style.display = 'flex';
        });
    }

    displayCompletion(node) {
        const scenarioPanel = document.querySelector('.scenario-panel');
        const decisionPanel = document.querySelector('.decision-panel');

        const totalPossibleScore = this.calculateMaxScore();
        const percentage = Math.round((this.simulator.score / totalPossibleScore) * 100);

        // Format the summary text with proper HTML structure
        let formattedSummary = node.summary;

        // Check if the summary contains "Key Learning Points:" or similar
        if (formattedSummary.includes('Key Learning Points:')) {
            // Split the summary into title and learning points
            const parts = formattedSummary.split('Key Learning Points:');
            const introText = parts[0].trim();
            const learningPoints = parts[1].trim();

            // Parse numbered list items (e.g., "1. **Topic**: Description")
            const points = learningPoints.split(/\d+\.\s+/).filter(p => p.trim());

            // Build formatted HTML
            formattedSummary = `
                <div class="completion-intro">${introText.replace(/\n/g, '<br>')}</div>
                <div class="learning-points-section">
                    <h3 class="learning-points-title">Key Learning Points:</h3>
                    <div class="learning-points-list">
            `;

            points.forEach((point, index) => {
                // Extract topic and description from markdown format
                const match = point.match(/\*\*(.*?)\*\*:\s*(.*)/);
                if (match) {
                    const topic = match[1];
                    const description = match[2];
                    formattedSummary += `
                        <div class="learning-point-item">
                            <div class="point-number">${index + 1}</div>
                            <div class="point-content">
                                <div class="point-topic">${topic}</div>
                                <div class="point-description">${description}</div>
                            </div>
                        </div>
                    `;
                } else {
                    // Fallback for points without markdown formatting
                    formattedSummary += `
                        <div class="learning-point-item">
                            <div class="point-number">${index + 1}</div>
                            <div class="point-content">
                                <div class="point-description">${point.trim()}</div>
                            </div>
                        </div>
                    `;
                }
            });

            formattedSummary += `
                    </div>
                </div>
            `;
        } else {
            // If no learning points format, just replace newlines with breaks
            formattedSummary = `<div class="completion-summary">${formattedSummary.replace(/\n/g, '<br>')}</div>`;
        }

        const completionHTML = `
            <div class="completion-screen">
                <div class="completion-title">
                    <span class="completion-icon">🎉</span>
                    ${node.title || 'Scenario Complete!'}
                </div>
                
                ${formattedSummary}

                <div class="completion-stats">
                    <div class="stat-box">
                        <div class="stat-number">${this.simulator.score}</div>
                        <div class="stat-label">Total Score</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-number">${percentage}%</div>
                        <div class="stat-label">Performance</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-number">${this.simulator.correctDecisions}</div>
                        <div class="stat-label">Correct Decisions</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-number">${this.simulator.totalDecisions}</div>
                        <div class="stat-label">Total Decisions</div>
                    </div>
                </div>

                <div class="completion-actions">
                    <button class="continue-button" onclick="location.reload()">
                        <span>🔄</span> Try Again
                    </button>
                    <button class="continue-button menu-return" onclick="window.location.href='scenario-menu.html'">
                        <span>📚</span> Back to Scenarios
                    </button>
                </div>
            </div>
        `;

        // Replace scenario panel content
        scenarioPanel.innerHTML = completionHTML;

        // Hide decision panel
        decisionPanel.style.display = 'none';
    }

    calculateMaxScore() {
        let maxScore = 0;
        // Calculate maximum possible score by traversing all correct paths
        // This is a simplified version - you may want to implement a more sophisticated algorithm
        for (const nodeId in this.simulator.scenarioData.nodes) {
            const node = this.simulator.scenarioData.nodes[nodeId];
            if (node.points && node.result === 'correct') {
                maxScore += node.points;
            }
        }
        return maxScore || 30; // Default to 30 if calculation fails
    }

    updateScores() {
        document.getElementById('correctCount').textContent = this.simulator.correctDecisions;
        document.getElementById('stepCount').textContent = this.simulator.totalDecisions;
    }

    updatePathHistory() {
        const container = document.getElementById('pathHistory');
        container.innerHTML = '';

        this.simulator.pathHistory.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = `path-item ${item.result || ''} clickable`;

            div.innerHTML = `
                <strong>Step ${index + 1}:</strong> ${item.decision}
                ${item.result !== 'neutral' ? `<div class="path-result ${item.result}">→ ${item.result}</div>` : ''}
            `;

            div.onclick = () => this.showPathReview(item);
            container.appendChild(div);
        });
    }

    showPathReview(pathItem) {
        const modal = document.getElementById('feedbackModal');
        const header = document.getElementById('feedbackHeader');
        const text = document.getElementById('feedbackText');
        const refBox = document.getElementById('referenceBox');
        const refText = document.getElementById('referenceText');

        header.className = `feedback-header feedback-${pathItem.result}`;
        header.innerHTML = `Review: ${pathItem.nodeTitle}`;
        text.innerHTML = `<strong>Your Choice:</strong> ${pathItem.decision}<br><br>${pathItem.feedback || 'No feedback available.'}`;

        if (pathItem.reference) {
            refBox.style.display = 'block';
            refText.textContent = pathItem.reference;
            this.simulator.currentReference = pathItem.reference;
        } else {
            refBox.style.display = 'none';
        }

        modal.style.display = 'flex';
    }
}

// Global instance
const simulatorUI = new SimulatorUI();

// Global functions
function continuePath() {
    if (simulatorUI.feedbackCallback) {
        simulatorUI.feedbackCallback();
    }
}

function togglePathTracker() {
    const container = document.getElementById('pathHistoryContainer');
    const icon = document.querySelector('.path-toggle-icon');
    container.classList.toggle('collapsed');
    icon.textContent = container.classList.contains('collapsed') ? '▼' : '▲';
}

function showReference() {
    const reference = simulatorUI.simulator.scenarioData.references[simulatorUI.simulator.currentReference];
    if (!reference) return;

    const modal = document.getElementById('referenceModal');
    const title = document.getElementById('referenceTitle');
    const body = document.getElementById('referenceBody');

    title.textContent = reference.title;
    body.innerHTML = reference.content;

    modal.style.display = 'flex';
}

function closeReference() {
    document.getElementById('referenceModal').style.display = 'none';
}

// Keyboard shortcuts
document.addEventListener('keypress', (e) => {
    const num = parseInt(e.key);
    if (num >= 1 && num <= 9) {
        const buttons = document.querySelectorAll('.decision-button');
        if (buttons[num - 1]) {
            buttons[num - 1].click();
        }
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeReference();
        const feedbackModal = document.getElementById('feedbackModal');
        if (feedbackModal.style.display === 'flex') {
            continuePath();
        }
    }
});

// Initialize on load
window.onload = function() {
    simulatorUI.init();
};