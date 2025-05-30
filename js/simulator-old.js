// Clinical Decision Simulator Engine
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

    async loadScenario(scenarioFile) {
        try {
            const response = await fetch(scenarioFile);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.scenarioData = await response.json();
            this.currentNode = 'start';
            this.pathHistory = [];
            this.correctDecisions = 0;
            this.totalDecisions = 0;
            this.score = 0;

            // Update page title with scenario name
            if (this.scenarioData.metadata && this.scenarioData.metadata.title) {
                document.title = `Clinical Simulator - ${this.scenarioData.metadata.title}`;
                document.getElementById('scenarioTitle').textContent = this.scenarioData.metadata.title;
            }

            return true;
        } catch (error) {
            console.error('Error loading scenario:', error);
            console.log('Attempting to load embedded fallback scenario...');
            // If external file fails, load embedded scenario
            this.loadEmbeddedScenario();
            return true;
        }
    }

    loadEmbeddedScenario() {
        // Fallback embedded scenario if external file fails
        this.scenarioData = {
            "metadata": {
                "title": "Acute Liver Failure - Airway Emergency",
                "description": "Manage a critically ill patient with acute-on-chronic liver failure requiring emergent intubation",
                "specialty": "Critical Care/Emergency Medicine",
                "difficulty": "advanced",
                "duration": "15-20 min"
            },
            "initial_state": {
                "patient": {
                    "demographics": "52-year-old female",
                    "weight": "80 kg",
                    "diagnosis": "Acute-on-chronic liver failure with sepsis"
                },
                "vitals": {
                    "bp": {"value": "75/40 mmHg", "critical": true},
                    "spo2": {"value": "85%", "critical": true},
                    "ph": {"value": "7.18", "critical": true},
                    "inr": {"value": "2.6", "critical": true}
                }
            },
            "nodes": {
                "start": {
                    "type": "scenario",
                    "title": "Initial Assessment",
                    "content": "Patient presenting with:\n• Obtunded mental status\n• Severe hemodynamic instability (SBP 75 mmHg)\n• Significant hypoxemia (SpO₂ 85%)\n• Severe metabolic acidosis (pH 7.18)\n• Large volume ascites\n• Coagulopathy (INR 2.6)\n\nUrgent airway evaluation required due to deteriorating respiratory status.",
                    "decisions": [
                        {"id": "immediate", "text": "Proceed with immediate intubation", "next": "immediate_intubation"},
                        {"id": "assess", "text": "Assess risks and optimize physiology first", "next": "assess_risks"}
                    ]
                },
                "immediate_intubation": {
                    "type": "outcome",
                    "result": "incorrect",
                    "feedback": "High-risk factors for peri-intubation cardiac arrest are present (hypotension, hypoxemia, metabolic acidosis). Optimization before intubation is critical.",
                    "reference": "Section 3.3: Risk Factors",
                    "points": 0,
                    "next": "start"
                },
                "assess_risks": {
                    "type": "scenario",
                    "title": "Pre-oxygenation Strategy",
                    "content": "Risk assessment complete. Multiple high-risk factors identified.\n\nNext step: Optimize pre-oxygenation to prevent desaturation during intubation.",
                    "result": "correct",
                    "feedback": "Excellent decision! Recognizing and addressing modifiable risk factors before intubation significantly reduces complications.",
                    "reference": "Section 3.3: Risk Factors",
                    "points": 10,
                    "decisions": [
                        {"id": "standard", "text": "Use standard face mask with 100% O₂", "next": "standard_mask"},
                        {"id": "hfnc", "text": "Use high-flow nasal cannula with head of bed elevation", "next": "hfnc_preoxygenation"}
                    ]
                },
                "standard_mask": {
                    "type": "outcome",
                    "result": "incorrect",
                    "feedback": "Standard face masks fail to create a tight seal and are limited by V/Q mismatch and shunt physiology in liver failure patients.",
                    "reference": "Section 4.2: Hypoxemia Management",
                    "points": 0,
                    "next": "assess_risks"
                },
                "hfnc_preoxygenation": {
                    "type": "scenario",
                    "title": "Hemodynamic Optimization",
                    "content": "Pre-oxygenation initiated with HFNC at 60L/min, FiO₂ 100%, HOB elevated to 30 degrees.\nSpO₂ improving to 91%.\n\nCurrent BP remains 75/40 mmHg. Need to address hemodynamics before intubation.",
                    "result": "correct",
                    "feedback": "HFNC with flows of 40-60L/min helps create an oxygen reservoir. HOB elevation improves shunt physiology.",
                    "reference": "Section 4.2: Hypoxemia Management",
                    "points": 10,
                    "vitals_update": {
                        "spo2": {"value": "91%", "critical": true}
                    },
                    "decisions": [
                        {"id": "fluid", "text": "Give additional 500 mL fluid bolus", "next": "fluid_bolus"},
                        {"id": "phenylephrine", "text": "Administer push-dose phenylephrine", "next": "completion"}
                    ]
                },
                "fluid_bolus": {
                    "type": "outcome",
                    "result": "incorrect",
                    "feedback": "This patient has non-volume responsive shock with large volume ascites. Additional fluid risks volume overload without improving hemodynamics.",
                    "reference": "Section 4.3: RAPID Approach",
                    "points": 0,
                    "next": "hfnc_preoxygenation"
                },
                "completion": {
                    "type": "completion",
                    "title": "Case Completed Successfully",
                    "summary": "Successful management of high-risk airway!\n\nKey Learning Points:\n1. Always optimize physiology before intubation in high-risk patients\n2. HFNC provides superior pre-oxygenation in liver failure\n3. Avoid fluid overload - use vasopressors for hemodynamic support\n4. Choose hemodynamically stable induction agents\n5. Video laryngoscopy improves first-pass success\n6. Start with conservative ventilator settings in unstable patients"
                }
            },
            "references": {
                "Section 3.3: Risk Factors": {
                    "title": "Risk Factors for Adverse Outcomes",
                    "content": "<h3>Major Risk Factors for Peri-intubation Cardiac Arrest</h3><p>The following factors significantly increase the risk of adverse events during emergency intubation:</p><ul><li><strong>Hypotension:</strong> SBP <90 mmHg (10-fold increased risk)</li><li><strong>Hypoxemia:</strong> SpO₂ <90% despite optimization</li><li><strong>Severe Acidosis:</strong> pH <7.2</li><li><strong>Shock Index >0.9:</strong> HR/SBP ratio indicating hemodynamic instability</li><li><strong>Age >65:</strong> Reduced physiologic reserve</li></ul><h3>Risk Modification Strategies</h3><p style='background: rgba(76, 175, 80, 0.2); padding: 10px; border-radius: 5px;'>This patient has multiple high-risk features requiring optimization before intubation:</p><ul><li>Pre-oxygenation with HFNC to improve oxygen reserve</li><li>Hemodynamic support with vasopressors</li><li>Careful medication selection to avoid cardiovascular collapse</li><li>Preparation for post-intubation hypotension</li></ul>"
                },
                "Section 4.2: Hypoxemia Management": {
                    "title": "Hypoxemia Management in Liver Failure",
                    "content": "<h3>Pre-oxygenation in Liver Failure</h3><p>Liver failure patients have unique challenges:</p><ul><li><strong>Hepatopulmonary Syndrome:</strong> Intrapulmonary shunting limits oxygenation</li><li><strong>Ascites:</strong> Diaphragmatic elevation reduces FRC</li><li><strong>Pulmonary Edema:</strong> V/Q mismatch from volume overload</li></ul><h3>HFNC vs Standard Oxygen Delivery</h3><table style='width: 100%; margin: 20px 0; border-collapse: collapse;'><tr style='background: rgba(33, 150, 243, 0.2);'><th style='padding: 10px; border: 1px solid #2196F3;'>Method</th><th style='padding: 10px; border: 1px solid #2196F3;'>FiO₂ Delivery</th><th style='padding: 10px; border: 1px solid #2196F3;'>Benefits</th><th style='padding: 10px; border: 1px solid #2196F3;'>Limitations</th></tr><tr><td style='padding: 10px; border: 1px solid #2196F3;'>Standard Mask</td><td style='padding: 10px; border: 1px solid #2196F3;'>60-80%</td><td style='padding: 10px; border: 1px solid #2196F3;'>Simple, available</td><td style='padding: 10px; border: 1px solid #2196F3;'>Poor seal, no PEEP</td></tr><tr><td style='padding: 10px; border: 1px solid #2196F3;'>HFNC</td><td style='padding: 10px; border: 1px solid #2196F3;'>Up to 100%</td><td style='padding: 10px; border: 1px solid #2196F3;'>PEEP effect, apneic oxygenation</td><td style='padding: 10px; border: 1px solid #2196F3;'>Equipment needed</td></tr></table>"
                },
                "Section 4.3: RAPID Approach": {
                    "title": "Cardiovascular Stability: RAPID Approach",
                    "content": "<h3>RAPID Assessment Framework</h3><ul><li><strong>R</strong>esponsiveness to fluids</li><li><strong>A</strong>fterload assessment</li><li><strong>P</strong>reexisting conditions</li><li><strong>I</strong>notropic state</li><li><strong>D</strong>ynamic monitoring</li></ul><h3>Hemodynamic Support in Liver Failure</h3><p style='background: rgba(76, 175, 80, 0.2); padding: 10px; border-radius: 5px;'><strong>Key Principle:</strong> Most cirrhotic patients have distributive shock (low SVR) rather than hypovolemia</p><h3>Vasopressor Selection</h3><ul><li><strong>Push-dose Phenylephrine (100-200 mcg):</strong><ul><li>Pure α-agonist, increases SVR</li><li>Rapid onset (30-60 seconds)</li><li>Short duration (5-10 minutes)</li><li>Ideal for bridging to infusion</li></ul></li><li><strong>Norepinephrine infusion:</strong><ul><li>First-line for septic shock</li><li>α and β effects</li><li>Start at 0.05-0.1 mcg/kg/min</li></ul></li></ul>"
                }
            }
        };
    }

    getCurrentNode() {
        return this.scenarioData.nodes[this.currentNode];
    }

    makeDecision(decisionId) {
        const node = this.getCurrentNode();

        if (!node) {
            console.error('No current node found');
            return null;
        }

        if (!node.decisions || !Array.isArray(node.decisions)) {
            console.error('Current node has no decisions array:', node);
            return null;
        }

        const decision = node.decisions.find(d => d.id === decisionId);

        if (!decision) {
            console.error('Invalid decision:', decisionId);
            return null;
        }

        // Get the next node
        const nextNode = this.scenarioData.nodes[decision.next];

        if (!nextNode) {
            console.error('Next node not found:', decision.next);
            return null;
        }

        // Check if this is a repeat incorrect or partial decision
        const isRepeatNonCorrect = (nextNode.result === 'incorrect' || nextNode.result === 'partial') &&
            this.pathHistory.some(item =>
                item.nodeId === decision.next &&
                (item.result === 'incorrect' || item.result === 'partial')
            );

        // Only record the decision if it's not a repeat incorrect/partial
        if (!isRepeatNonCorrect) {
            this.pathHistory.push({
                nodeId: decision.next,
                from: this.currentNode,
                fromTitle: node.title || 'Decision',
                nodeTitle: nextNode.title || decision.text,
                decision: decision.text,
                result: nextNode.result || 'neutral',
                feedback: nextNode.feedback,
                reference: nextNode.reference,
                content: nextNode.content || node.content,  // Store content for review
                timestamp: Date.now()
            });
        }

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
            actualNextNode: nextNode.next // Include the outcome's next field
        };

        // Don't update current node for outcome types - wait for UI to handle it
        if (nextNode.type === 'scenario') {
            this.currentNode = decision.next;
        }

        return result;
    }

    restart() {
        this.currentNode = 'start';
        this.pathHistory = [];
        this.correctDecisions = 0;
        this.totalDecisions = 0;
        this.score = 0;
    }
}

// UI Controller
class SimulatorUI {
    constructor() {
        this.simulator = new ClinicalSimulator();
        this.scenarioName = null;
        this.init();
    }

    async init() {
        // Read URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        this.scenarioName = urlParams.get('scenario') || 'liver-failure';

        // Build scenario file path
        const scenarioFile = `scenarios/${this.scenarioName}.json`;

        console.log(`Loading scenario: ${this.scenarioName} from ${scenarioFile}`);

        // Show loading screen with scenario name
        const loadingText = document.querySelector('.loading-text');
        if (loadingText) {
            loadingText.textContent = `Loading ${this.scenarioName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Scenario...`;
        }

        // Load scenario
        await this.simulator.loadScenario(scenarioFile);

        // Update patient info if provided
        if (this.simulator.scenarioData.initial_state && this.simulator.scenarioData.initial_state.patient) {
            this.updatePatientInfo(this.simulator.scenarioData.initial_state.patient);
        }

        // Update initial vitals if provided
        if (this.simulator.scenarioData.initial_state && this.simulator.scenarioData.initial_state.vitals) {
            this.updateInitialVitals(this.simulator.scenarioData.initial_state.vitals);
        }

        // Hide loading screen after scenario loads
        setTimeout(() => {
            document.getElementById('loadingScreen').style.opacity = '0';
            setTimeout(() => {
                document.getElementById('loadingScreen').style.display = 'none';
            }, 500);
        }, 1000);

        // Initialize display
        this.updateDisplay();

        // Add scenario selector if multiple scenarios detected
        this.setupScenarioSelector();
    }

    setupScenarioSelector() {
        // Add a "Back to Menu" or "Change Scenario" button
        const header = document.querySelector('.header');
        if (header && !document.getElementById('scenarioMenu')) {
            const menuButton = document.createElement('button');
            menuButton.id = 'scenarioMenu';
            menuButton.style.cssText = `
                background: rgba(0, 0, 0, 0.3);
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: white;
                padding: 8px 16px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.3s ease;
            `;
            menuButton.textContent = '📚 Scenario Menu';
            menuButton.onmouseover = () => menuButton.style.background = 'rgba(0, 0, 0, 0.5)';
            menuButton.onmouseout = () => menuButton.style.background = 'rgba(0, 0, 0, 0.3)';
            menuButton.onclick = () => {
                // Show available scenarios
                this.showScenarioMenu();
            };
            header.appendChild(menuButton);
        }
    }

    showScenarioMenu() {
        // Create a modal with available scenarios
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 3000;
        `;

        const menuContent = document.createElement('div');
        menuContent.style.cssText = `
            background: linear-gradient(135deg, #1a1a2e, #16213e);
            border-radius: 15px;
            padding: 40px;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            border: 2px solid rgba(255, 255, 255, 0.2);
        `;

        // Available scenarios (you can expand this list)
        const scenarios = [
            { id: 'liver-failure', name: 'Acute Liver Failure', difficulty: 'Advanced' },
            { id: 'cardiac-arrest', name: 'Cardiac Arrest Protocol', difficulty: 'Intermediate' },
            { id: 'stroke-protocol', name: 'Acute Stroke Management', difficulty: 'Intermediate' },
            { id: 'sepsis-bundle', name: 'Sepsis Bundle', difficulty: 'Basic' },
            { id: 'trauma-airway', name: 'Trauma Airway', difficulty: 'Advanced' }
        ];

        menuContent.innerHTML = `
            <h2 style="color: #4CAF50; margin-bottom: 30px; text-align: center;">Select a Clinical Scenario</h2>
            <div style="display: grid; gap: 15px;">
                ${scenarios.map(scenario => `
                    <div class="scenario-option" onclick="window.location.href='?scenario=${scenario.id}'" style="
                        background: rgba(76, 175, 80, 0.1);
                        border: 2px solid rgba(76, 175, 80, 0.3);
                        border-radius: 10px;
                        padding: 20px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    " onmouseover="this.style.borderColor='#4CAF50'; this.style.transform='translateY(-2px)'" 
                       onmouseout="this.style.borderColor='rgba(76, 175, 80, 0.3)'; this.style.transform='translateY(0)'">
                        <h3 style="color: #4CAF50; margin-bottom: 5px;">${scenario.name}</h3>
                        <p style="margin: 0; font-size: 14px; opacity: 0.8;">Difficulty: ${scenario.difficulty}</p>
                    </div>
                `).join('')}
            </div>
            <button onclick="this.parentElement.parentElement.remove()" style="
                background: linear-gradient(135deg, #ff4444, #cc0000);
                color: white;
                border: none;
                padding: 12px 30px;
                border-radius: 5px;
                font-size: 16px;
                cursor: pointer;
                width: 100%;
                margin-top: 30px;
            ">Close</button>
        `;

        modal.appendChild(menuContent);
        document.body.appendChild(modal);
    }

    updatePatientInfo(patient) {
        const patientInfoElement = document.getElementById('patientInfo');
        if (patientInfoElement && patient) {
            patientInfoElement.innerHTML = `
                <strong>Patient:</strong> ${patient.demographics || 'Unknown'}<br>
                <strong>Weight:</strong> ${patient.weight || 'Unknown'}<br>
                <strong>Diagnosis:</strong> ${patient.diagnosis || 'Unknown'}
            `;
        }
    }

    updateInitialVitals(vitals) {
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

    updateDisplay() {
        const node = this.simulator.getCurrentNode();

        if (!node) {
            console.error('Current node not found');
            return;
        }

        // Handle different node types
        switch (node.type) {
            case 'scenario':
                this.displayScenario(node);
                break;
            case 'outcome':
                // Outcome nodes are handled in makeDecision, not displayed
                break;
            case 'completion':
                this.displayCompletion(node);
                break;
            default:
                console.error('Unknown node type:', node.type);
        }

        // Update scores
        this.updateScores();

        // Update path history
        this.updatePathHistory();
    }

    displayScenario(node) {
        // Update title and content
        document.getElementById('statusTitle').textContent = node.title || 'Clinical Situation';
        document.getElementById('currentSituation').innerHTML = this.formatContent(node.content);

        // Update vitals if specified
        if (node.vitals_update) {
            this.updateVitals(node.vitals_update);
        }

        // Display decisions
        const container = document.getElementById('decisionsContainer');
        container.innerHTML = '';

        // Check if node has decisions
        if (node.decisions && Array.isArray(node.decisions)) {
            node.decisions.forEach((decision, index) => {
                // Special handling for completion button
                if (decision.next === 'completion' && decision.text.toLowerCase().includes('complete')) {
                    const button = document.createElement('div');
                    button.className = 'decision-button completion-button';
                    // Remove inline style - let CSS handle it
                    button.innerHTML = `
                        <div class="decision-label">✅ CASE COMPLETED</div>
                        <div class="decision-text">Back to Main Menu</div>
                    `;
                    button.onclick = () => window.location.href = 'scenario-menu.html';
                    container.appendChild(button);
                } else {
                    const button = this.createDecisionButton(decision, index + 1);
                    container.appendChild(button);
                }
            });
        } else {
            console.warn('No decisions found for node:', node);
            // Show a message if no decisions available
            container.innerHTML = '<p style="text-align: center; opacity: 0.7;">No decisions available for this scenario.</p>';
        }
    }

    createDecisionButton(decision, number) {
        const button = document.createElement('div');
        button.className = 'decision-button';
        button.innerHTML = `
            <div class="decision-label">Option ${number}</div>
            <div class="decision-text">${decision.text}</div>
        `;
        button.onclick = () => this.makeDecision(decision.id);
        return button;
    }

    async makeDecision(decisionId) {
        const result = this.simulator.makeDecision(decisionId);

        if (!result) {
            console.error('Failed to process decision');
            return;
        }

        // Show feedback
        await this.showFeedback(result);

        // Handle next action based on result type
        if (result.type === 'outcome') {
            // For outcome nodes, move to the node specified in the outcome's "next" field
            if (result.actualNextNode) {
                this.simulator.currentNode = result.actualNextNode;
                this.updateDisplay();
            } else {
                console.error('Outcome node missing next destination');
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

            // Show points earned
            if (result.points !== undefined) {
                const pointsDiv = document.getElementById('outcomePoints');
                if (pointsDiv) {
                    pointsDiv.innerHTML = `Points earned: <strong>${result.points}</strong>`;
                    pointsDiv.style.display = 'block';
                }
            }

            // Set up continue callback
            window.feedbackCallback = () => {
                modal.style.display = 'none';
                document.body.style.overflow = '';
                resolve();
            };

            // Show modal
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        });
    }

    displayCompletion(node) {
        const completionHTML = `
            <div class="completion-screen">
                <h2 class="completion-title">${node.title || 'Scenario Complete!'}</h2>
                <div class="completion-stats">
                    <div class="stat-box">
                        <div class="stat-number">${this.simulator.score}</div>
                        <div class="stat-label">Points Earned</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-number">${this.simulator.correctDecisions}</div>
                        <div class="stat-label">Correct Decisions</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-number">${this.simulator.totalDecisions}</div>
                        <div class="stat-label">Total Decisions</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-number">${Math.round((this.simulator.correctDecisions / this.simulator.totalDecisions) * 100)}%</div>
                        <div class="stat-label">Success Rate</div>
                    </div>
                </div>
                <div style="text-align: left; background: rgba(0,0,0,0.3); padding: 20px; border-radius: 10px; margin: 20px 0;">
                    ${this.formatContent(node.summary || '')}
                </div>
                <button class="continue-button" onclick="simulatorUI.showCompleteScenarioReview()" style="background: linear-gradient(135deg, #2196F3, #1976D2); margin-bottom: 10px;">
                    📋 Review Complete Scenario
                </button>
                <button class="continue-button" onclick="simulatorUI.restart()">
                    Try Again
                </button>
                <button class="continue-button" onclick="window.location.href='?scenario=${this.scenarioName}'">
                    Restart Fresh
                </button>
                <button class="continue-button" style="background: linear-gradient(135deg, #FF5722, #E64A19);" onclick="simulatorUI.showScenarioMenu()">
                    Choose Another Scenario
                </button>
            </div>
        `;

        // Replace scenario panel content
        document.querySelector('.scenario-panel').innerHTML = completionHTML;

        // Hide decision panel
        document.querySelector('.decision-panel').style.display = 'none';

        // Update path tracker to show it's clickable for full review
        const pathTitle = document.querySelector('.path-title');
        if (pathTitle) {
            pathTitle.innerHTML = 'Decision Path<span style="display: block; font-size: 11px; font-weight: normal; opacity: 0.8; margin-top: 3px; color: #4CAF50;">✨ Click for Complete Review</span>';
        }

        // Make the entire path tracker clickable for complete review
        const pathTracker = document.querySelector('.path-tracker');
        if (pathTracker) {
            pathTracker.classList.add('completion-ready');
            pathTracker.style.cursor = 'pointer';
            pathTracker.onclick = () => this.showCompleteScenarioReview();
        }
    }

    showCompleteScenarioReview() {
        // Create a full-screen modal for scenario review
        const modal = document.createElement('div');
        modal.className = 'scenario-review-modal';
        modal.innerHTML = `
            <div class="scenario-review-content">
                <div class="scenario-review-header">
                    <h2>📚 Complete Scenario Review: ${this.simulator.scenarioData.metadata.title}</h2>
                    <button class="close-button" onclick="this.parentElement.parentElement.parentElement.remove(); document.body.style.overflow = '';">×</button>
                </div>
                <div class="scenario-review-body">
                    ${this.buildCompleteScenarioReview()}
                </div>
                <div class="scenario-review-footer">
                    <button class="continue-button" onclick="this.parentElement.parentElement.parentElement.remove(); document.body.style.overflow = '';">
                        Close Review
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
    }

    buildCompleteScenarioReview() {
        let reviewHTML = '';
        const scenarioData = this.simulator.scenarioData;
        const visitedNodes = new Set();

        // Start with initial patient state
        if (scenarioData.initial_state && scenarioData.initial_state.patient) {
            reviewHTML += `
                <div class="review-section">
                    <h3>Initial Patient Presentation</h3>
                    <div class="review-patient-info">
                        <strong>Patient:</strong> ${scenarioData.initial_state.patient.demographics}<br>
                        <strong>Weight:</strong> ${scenarioData.initial_state.patient.weight}<br>
                        <strong>Diagnosis:</strong> ${scenarioData.initial_state.patient.diagnosis}
                    </div>
                </div>
            `;
        }

        // Build the scenario flow starting from 'start' node
        reviewHTML += this.buildNodeReview('start', scenarioData.nodes, visitedNodes, 1);

        return reviewHTML;
    }

    buildNodeReview(nodeId, nodes, visitedNodes, level) {
        if (visitedNodes.has(nodeId) || !nodes[nodeId]) {
            return '';
        }

        visitedNodes.add(nodeId);
        const node = nodes[nodeId];
        let html = '';

        if (node.type === 'scenario') {
            html += `
                <div class="review-node scenario-level-${level}">
                    <h4 class="review-node-title">${node.title}</h4>
                    <div class="review-node-content">${this.formatContent(node.content)}</div>
            `;

            if (node.decisions && node.decisions.length > 0) {
                html += '<div class="review-decisions"><strong>Decision Options:</strong><ul>';

                node.decisions.forEach(decision => {
                    const nextNode = nodes[decision.next];
                    const isCorrect = nextNode && nextNode.result === 'correct';
                    const isPartial = nextNode && nextNode.result === 'partial';

                    html += `
                        <li class="review-decision ${isCorrect ? 'correct' : isPartial ? 'partial' : 'incorrect'}">
                            ${isCorrect ? '✅' : isPartial ? '⚠️' : '❌'} ${decision.text}
                            ${nextNode && nextNode.feedback ? `
                                <div class="review-feedback">
                                    <strong>Feedback:</strong> ${nextNode.feedback}
                                    ${nextNode.reference && scenarioData.references && scenarioData.references[nextNode.reference] ? 
                                        `<span class="review-reference" onclick="simulatorUI.showReferenceFromReview('${nextNode.reference}')">
                                            📖 ${nextNode.reference}
                                        </span>` : ''
                                    }
                                </div>
                            ` : ''}
                        </li>
                    `;

                    // Follow the correct path
                    if (isCorrect && nextNode.type === 'scenario') {
                        html += this.buildNodeReview(decision.next, nodes, visitedNodes, level + 1);
                    } else if (isCorrect && nextNode.next) {
                        html += this.buildNodeReview(nextNode.next, nodes, visitedNodes, level + 1);
                    }
                });

                html += '</ul></div>';
            }

            html += '</div>';
        }

        return html;
    }

    updateVitals(vitals) {
        // Update specific vital signs if they have dedicated elements
        if (vitals.spo2) {
            document.getElementById('vitalSpO2').textContent = vitals.spo2.value;
            document.getElementById('vitalSpO2').className = vitals.spo2.critical ? 'vital-value vital-critical' : 'vital-value vital-normal';
        }
        // Add other vitals updates as needed
        if (vitals.bp) {
            document.getElementById('vitalBP').textContent = vitals.bp.value;
            document.getElementById('vitalBP').className = vitals.bp.critical ? 'vital-value vital-critical' : 'vital-value vital-normal';
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

    updateScores() {
        document.getElementById('correctCount').textContent = this.simulator.correctDecisions;
        document.getElementById('stepCount').textContent = this.simulator.totalDecisions;
    }

    updatePathHistory() {
        const container = document.getElementById('pathHistory');
        if (!container) return;

        container.innerHTML = '';

        this.simulator.pathHistory.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = `path-item ${item.result || ''} clickable`;
            div.style.cursor = 'pointer';

            // Create the title and result
            const titleText = document.createElement('div');
            titleText.style.fontWeight = 'bold';
            titleText.innerHTML = item.nodeTitle || item.fromTitle;
            div.appendChild(titleText);

            // Add the decision text
            const decisionText = document.createElement('div');
            decisionText.style.fontSize = '12px';
            decisionText.style.opacity = '0.9';
            decisionText.style.marginTop = '3px';
            decisionText.innerHTML = item.decision;
            div.appendChild(decisionText);

            // Add result indicator
            if (item.result) {
                const resultText = document.createElement('div');
                resultText.className = `path-result ${item.result}`;

                let resultIcon = '';
                let resultLabel = '';

                switch(item.result) {
                    case 'correct':
                        resultIcon = '✅';
                        resultLabel = 'Correct';
                        break;
                    case 'incorrect':
                        resultIcon = '❌';
                        resultLabel = 'Incorrect';
                        break;
                    case 'partial':
                        resultIcon = '⚠️';
                        resultLabel = 'Partially Correct';
                        break;
                }

                resultText.innerHTML = `${resultIcon} ${resultLabel}`;
                div.appendChild(resultText);
            }

            // Make the item clickable to review
            div.onclick = () => this.showPathReview(item);

            container.appendChild(div);
        });

        // Scroll to bottom to show latest decision
        container.scrollTop = container.scrollHeight;
    }

    showPathReview(pathItem) {
        // Create a review modal similar to feedback modal
        const modal = document.createElement('div');
        modal.className = 'feedback-modal';
        modal.style.display = 'flex';
        modal.style.zIndex = '2001'; // Higher than reference modal

        const content = document.createElement('div');
        content.className = 'feedback-content';
        content.innerHTML = `
            <div class="feedback-header ${pathItem.result ? 'feedback-' + pathItem.result : ''}">
                <span class="feedback-icon">${pathItem.result === 'correct' ? '✅' : pathItem.result === 'incorrect' ? '❌' : '⚠️'}</span>
                Review: ${pathItem.nodeTitle || pathItem.fromTitle}
            </div>
            <div class="feedback-text">
                <strong>Your Choice:</strong> ${pathItem.decision}
                <br><br>
                ${pathItem.feedback || 'No feedback available for this decision.'}
            </div>
            ${pathItem.reference && this.simulator.scenarioData.references && this.simulator.scenarioData.references[pathItem.reference] ? `
                <div class="reference-box" style="display: block;">
                    <div class="reference-label">Reference</div>
                    <div class="reference-text" onclick="simulatorUI.showReferenceFromReview('${pathItem.reference}')">${pathItem.reference}</div>
                </div>
            ` : ''}
            <button class="continue-button" onclick="this.parentElement.parentElement.remove()">Close Review</button>
        `;

        modal.appendChild(content);
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';

        // Close on background click
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
                document.body.style.overflow = '';
            }
        };
    }

    showReferenceFromReview(referenceId) {
        const reference = this.simulator.scenarioData.references[referenceId];
        if (!reference) return;

        // Close any existing reference modal first
        const existingModal = document.getElementById('referenceModal');
        if (existingModal) {
            existingModal.style.display = 'none';
        }

        // Show the reference
        const modal = document.getElementById('referenceModal');
        const title = document.getElementById('referenceTitle');
        const body = document.getElementById('referenceBody');

        title.textContent = reference.title;
        body.innerHTML = reference.content;

        modal.style.display = 'flex';
        modal.style.zIndex = '2002'; // Higher than review modal
    }

    formatContent(content) {
        // Convert newlines to <br> and format lists
        return content
            .replace(/\\n/g, '<br>')
            .replace(/•/g, '&bull;');
    }

    restart() {
        this.simulator.restart();
        document.querySelector('.decision-panel').style.display = 'block';
        this.updateDisplay();

        // Scroll to top
        window.scrollTo(0, 0);

        // Reset patient info and vitals to initial state
        if (this.simulator.scenarioData.initial_state) {
            if (this.simulator.scenarioData.initial_state.patient) {
                this.updatePatientInfo(this.simulator.scenarioData.initial_state.patient);
            }
            if (this.simulator.scenarioData.initial_state.vitals) {
                this.updateInitialVitals(this.simulator.scenarioData.initial_state.vitals);
            }
        }
    }
}

// Global instance
let simulatorUI;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    simulatorUI = new SimulatorUI();
});

// Global functions for buttons
function continuePath() {
    if (window.feedbackCallback) {
        window.feedbackCallback();
    }
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
    document.body.style.overflow = 'hidden';
}

function closeReference() {
    document.getElementById('referenceModal').style.display = 'none';
    document.body.style.overflow = '';
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
        // Also close scenario menu if open
        const modal = document.querySelector('[style*="z-index: 3000"]');
        if (modal) modal.remove();
    }
});