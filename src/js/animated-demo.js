// Animated Demo Video Simulation
// Creates an interactive animated walkthrough of the retirement calculator

class AnimatedDemo {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.isPlaying = false;
        this.currentStep = 0;
        this.animationSpeed = 60; // FPS
        this.stepDuration = 3000; // milliseconds per step

        this.setupCanvas();
        this.initializeSteps();
        this.setupControls();
    }

    setupCanvas() {
        // Set canvas size
        this.canvas.width = 800;
        this.canvas.height = 600;

        // Set canvas style
        this.canvas.style.border = '2px solid #e2e8f0';
        this.canvas.style.borderRadius = '12px';
        this.canvas.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)';
    }

    initializeSteps() {
        this.steps = [
            {
                title: "Welcome to the Calculator",
                description: "The Australian Retirement Calculator helps you plan your financial future",
                duration: 3000,
                animation: this.animateWelcome.bind(this)
            },
            {
                title: "Enter Your Details",
                description: "Start by entering your personal and financial information",
                duration: 4000,
                animation: this.animateDataEntry.bind(this)
            },
            {
                title: "Risk Assessment",
                description: "The calculator analyzes your risk capacity, tolerance, and requirements",
                duration: 3500,
                animation: this.animateRiskAssessment.bind(this)
            },
            {
                title: "Monte Carlo Simulation",
                description: "Running thousands of scenarios to model market uncertainty",
                duration: 5000,
                animation: this.animateMonteCarloSimulation.bind(this)
            },
            {
                title: "AI Recommendations",
                description: "Generating personalized recommendations across 8 strategic areas",
                duration: 4000,
                animation: this.animateAIRecommendations.bind(this)
            },
            {
                title: "Results & Charts",
                description: "Comprehensive visualizations of your retirement projection",
                duration: 3500,
                animation: this.animateResults.bind(this)
            },
            {
                title: "Export & Share",
                description: "Professional reports ready for your advisor",
                duration: 3000,
                animation: this.animateExport.bind(this)
            }
        ];
    }

    setupControls() {
        // Create control panel
        const controlPanel = document.createElement('div');
        controlPanel.className = 'demo-controls mt-4 flex justify-center space-x-4';
        controlPanel.innerHTML = `
            <button id="playBtn" class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
                <i class="fas fa-play mr-2"></i>Play Demo
            </button>
            <button id="pauseBtn" class="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition" disabled>
                <i class="fas fa-pause mr-2"></i>Pause
            </button>
            <button id="resetBtn" class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition">
                <i class="fas fa-redo mr-2"></i>Reset
            </button>
        `;

        this.canvas.parentNode.insertBefore(controlPanel, this.canvas.nextSibling);

        // Add event listeners
        document.getElementById('playBtn').addEventListener('click', () => this.play());
        document.getElementById('pauseBtn').addEventListener('click', () => this.pause());
        document.getElementById('resetBtn').addEventListener('click', () => this.reset());

        // Create progress bar
        const progressBar = document.createElement('div');
        progressBar.className = 'demo-progress mt-4';
        progressBar.innerHTML = `
            <div class="flex justify-between text-sm text-gray-600 mb-2">
                <span id="currentStepTitle">Ready to start</span>
                <span id="stepCounter">0 / ${this.steps.length}</span>
            </div>
            <div class="progress-bar bg-gray-200 h-2 rounded-full">
                <div id="progressFill" class="progress-fill bg-indigo-600 h-full rounded-full" style="width: 0%"></div>
            </div>
        `;

        controlPanel.parentNode.insertBefore(progressBar, controlPanel.nextSibling);
    }

    play() {
        if (!this.isPlaying) {
            this.isPlaying = true;
            document.getElementById('playBtn').disabled = true;
            document.getElementById('pauseBtn').disabled = false;
            this.animate();
        }
    }

    pause() {
        this.isPlaying = false;
        document.getElementById('playBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
    }

    reset() {
        this.pause();
        this.currentStep = 0;
        this.stepStartTime = 0;
        this.updateProgress();
        this.clearCanvas();
        this.drawWelcomeScreen();
    }

    animate() {
        if (!this.isPlaying) return;

        const now = Date.now();
        if (!this.stepStartTime) {
            this.stepStartTime = now;
        }

        const elapsed = now - this.stepStartTime;
        const currentStepData = this.steps[this.currentStep];

        if (currentStepData) {
            // Calculate progress within current step
            const stepProgress = Math.min(elapsed / currentStepData.duration, 1);

            // Run step animation
            currentStepData.animation(stepProgress);

            // Update progress display
            this.updateProgress();

            // Check if step is complete
            if (stepProgress >= 1) {
                this.currentStep++;
                this.stepStartTime = now;

                if (this.currentStep >= this.steps.length) {
                    // Demo complete
                    this.isPlaying = false;
                    this.showCompletionMessage();
                    document.getElementById('playBtn').disabled = false;
                    document.getElementById('pauseBtn').disabled = true;
                    return;
                }
            }
        }

        this.animationFrame = requestAnimationFrame(() => this.animate());
    }

    updateProgress() {
        const totalProgress = (this.currentStep / this.steps.length) * 100;
        const progressFill = document.getElementById('progressFill');
        const stepCounter = document.getElementById('stepCounter');
        const currentStepTitle = document.getElementById('currentStepTitle');

        if (progressFill) progressFill.style.width = totalProgress + '%';
        if (stepCounter) stepCounter.textContent = `${this.currentStep} / ${this.steps.length}`;

        if (currentStepTitle && this.steps[this.currentStep]) {
            currentStepTitle.textContent = this.steps[this.currentStep].title;
        }
    }

    clearCanvas() {
        this.ctx.fillStyle = '#f8fafc';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawText(text, x, y, options = {}) {
        const {
            fontSize = 16,
            fontWeight = 'normal',
            color = '#1f2937',
            textAlign = 'left',
            maxWidth = null
        } = options;

        this.ctx.font = `${fontWeight} ${fontSize}px Arial, sans-serif`;
        this.ctx.fillStyle = color;
        this.ctx.textAlign = textAlign;

        if (maxWidth) {
            this.ctx.fillText(text, x, y, maxWidth);
        } else {
            this.ctx.fillText(text, x, y);
        }
    }

    drawRect(x, y, width, height, color, options = {}) {
        const { radius = 0, stroke = false, strokeColor = '#000' } = options;

        this.ctx.fillStyle = color;

        if (radius > 0) {
            this.drawRoundedRect(x, y, width, height, radius);
            this.ctx.fill();
        } else {
            this.ctx.fillRect(x, y, width, height);
        }

        if (stroke) {
            this.ctx.strokeStyle = strokeColor;
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(x, y, width, height);
        }
    }

    drawRoundedRect(x, y, width, height, radius) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + width - radius, y);
        this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.ctx.lineTo(x + width, y + height - radius);
        this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.ctx.lineTo(x + radius, y + height);
        this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.quadraticCurveTo(x, y, x + radius, y);
        this.ctx.closePath();
    }

    drawCircle(x, y, radius, color, options = {}) {
        const { stroke = false, strokeColor = '#000', strokeWidth = 1 } = options;

        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
        this.ctx.fill();

        if (stroke) {
            this.ctx.strokeStyle = strokeColor;
            this.ctx.lineWidth = strokeWidth;
            this.ctx.stroke();
        }
    }

    animateWelcome(progress) {
        this.clearCanvas();

        // Draw logo/title area
        const titleY = 100 + Math.sin(progress * Math.PI) * 10;
        this.drawText('Australian Retirement Calculator', 400, titleY, {
            fontSize: 32,
            fontWeight: 'bold',
            color: '#4f46e5',
            textAlign: 'center'
        });

        // Animated subtitle
        if (progress > 0.3) {
            const subtitleAlpha = Math.min((progress - 0.3) / 0.3, 1);
            this.ctx.globalAlpha = subtitleAlpha;
            this.drawText('Your comprehensive retirement planning tool', 400, titleY + 40, {
                fontSize: 18,
                color: '#6b7280',
                textAlign: 'center'
            });
            this.ctx.globalAlpha = 1;
        }

        // Animated features list
        if (progress > 0.5) {
            const features = [
                '✓ Monte Carlo simulation',
                '✓ AI-powered recommendations',
                '✓ Australian tax & pension rules',
                '✓ Professional reports'
            ];

            features.forEach((feature, index) => {
                const featureProgress = Math.max(0, (progress - 0.5 - index * 0.1) / 0.1);
                if (featureProgress > 0) {
                    const x = 200 + featureProgress * 50;
                    const y = 200 + index * 30;

                    this.ctx.globalAlpha = featureProgress;
                    this.drawText(feature, x, y, {
                        fontSize: 16,
                        color: '#10b981'
                    });
                    this.ctx.globalAlpha = 1;
                }
            });
        }
    }

    animateDataEntry(progress) {
        this.clearCanvas();

        this.drawText('Step 1: Enter Your Details', 50, 50, {
            fontSize: 24,
            fontWeight: 'bold',
            color: '#1f2937'
        });

        // Draw form fields with animation
        const fields = [
            { label: 'Current Age', value: '35' },
            { label: 'Retirement Age', value: '65' },
            { label: 'Current Super', value: '$150,000' },
            { label: 'Annual Salary', value: '$80,000' }
        ];

        fields.forEach((field, index) => {
            const fieldProgress = Math.max(0, (progress - index * 0.2) / 0.2);
            if (fieldProgress > 0) {
                const y = 120 + index * 80;

                // Field label
                this.drawText(field.label, 50, y, {
                    fontSize: 16,
                    fontWeight: 'bold',
                    color: '#374151'
                });

                // Input field background
                this.drawRect(50, y + 10, 300, 40, '#ffffff', {
                    radius: 6,
                    stroke: true,
                    strokeColor: '#d1d5db'
                });

                // Typing animation
                if (fieldProgress > 0.3) {
                    const typingProgress = (fieldProgress - 0.3) / 0.7;
                    const displayText = field.value.substring(0, Math.floor(field.value.length * typingProgress));

                    this.drawText(displayText, 60, y + 32, {
                        fontSize: 16,
                        color: '#1f2937'
                    });

                    // Cursor blink
                    if (typingProgress < 1 && Math.floor(Date.now() / 500) % 2) {
                        this.drawText('|', 60 + displayText.length * 8, y + 32, {
                            fontSize: 16,
                            color: '#4f46e5'
                        });
                    }
                }

                // Validation checkmark
                if (fieldProgress > 0.8) {
                    this.drawCircle(370, y + 30, 12, '#10b981');
                    this.drawText('✓', 370, y + 35, {
                        fontSize: 16,
                        color: 'white',
                        textAlign: 'center'
                    });
                }
            }
        });

        // Progress indicator
        if (progress > 0.7) {
            this.drawText(`Form completion: ${Math.floor(progress * 100)}%`, 450, 150, {
                fontSize: 14,
                color: '#6b7280'
            });

            // Progress bar
            this.drawRect(450, 170, 200, 8, '#e5e7eb', { radius: 4 });
            this.drawRect(450, 170, 200 * progress, 8, '#4f46e5', { radius: 4 });
        }
    }

    animateRiskAssessment(progress) {
        this.clearCanvas();

        this.drawText('Step 2: Risk Assessment', 50, 50, {
            fontSize: 24,
            fontWeight: 'bold',
            color: '#1f2937'
        });

        // Draw risk assessment meters
        const riskTypes = [
            { name: 'Risk Capacity', value: 75, color: '#3b82f6', description: 'Your ability to take risk' },
            { name: 'Risk Tolerance', value: 60, color: '#10b981', description: 'Your comfort with volatility' },
            { name: 'Risk Requirement', value: 45, color: '#f59e0b', description: 'Risk needed for goals' }
        ];

        riskTypes.forEach((risk, index) => {
            const riskProgress = Math.max(0, (progress - index * 0.2) / 0.3);
            if (riskProgress > 0) {
                const x = 50;
                const y = 120 + index * 120;

                // Risk type label
                this.drawText(risk.name, x, y, {
                    fontSize: 18,
                    fontWeight: 'bold',
                    color: '#1f2937'
                });

                this.drawText(risk.description, x, y + 20, {
                    fontSize: 14,
                    color: '#6b7280'
                });

                // Meter background
                this.drawRect(x, y + 40, 400, 20, '#e5e7eb', { radius: 10 });

                // Animated meter fill
                const meterFillWidth = Math.min(400 * (risk.value / 100) * riskProgress, 400);
                this.drawRect(x, y + 40, meterFillWidth, 20, risk.color, { radius: 10 });

                // Value text
                if (riskProgress > 0.5) {
                    this.drawText(`${Math.floor(risk.value * riskProgress)}%`, x + meterFillWidth + 10, y + 55, {
                        fontSize: 16,
                        fontWeight: 'bold',
                        color: risk.color
                    });
                }
            }
        });

        // Risk alignment message
        if (progress > 0.8) {
            const alignment = 'Moderate risk profile - well balanced for your goals';
            this.drawRect(450, 200, 300, 100, '#f0f9ff', {
                radius: 8,
                stroke: true,
                strokeColor: '#3b82f6'
            });

            this.drawText('Risk Analysis', 465, 225, {
                fontSize: 16,
                fontWeight: 'bold',
                color: '#1e40af'
            });

            this.drawText(alignment, 465, 250, {
                fontSize: 14,
                color: '#1e40af',
                maxWidth: 270
            });
        }
    }

    animateMonteCarloSimulation(progress) {
        this.clearCanvas();

        this.drawText('Step 3: Monte Carlo Simulation', 50, 50, {
            fontSize: 24,
            fontWeight: 'bold',
            color: '#1f2937'
        });

        // Simulation parameters
        this.drawText('Running 1,000+ scenarios...', 50, 90, {
            fontSize: 16,
            color: '#6b7280'
        });

        // Progress bar
        this.drawRect(50, 110, 400, 20, '#e5e7eb', { radius: 10 });
        this.drawRect(50, 110, 400 * progress, 20, '#4f46e5', { radius: 10 });

        this.drawText(`${Math.floor(progress * 100)}%`, 460, 125, {
            fontSize: 16,
            fontWeight: 'bold',
            color: '#4f46e5'
        });

        // Animated simulation paths
        if (progress > 0.2) {
            const numPaths = Math.floor(progress * 50);
            const startX = 50;
            const startY = 200;
            const pathWidth = 400;
            const pathHeight = 200;

            for (let i = 0; i < numPaths; i++) {
                const pathProgress = Math.min((progress - 0.2) / 0.6, 1);
                const hue = (i * 7) % 360;
                const opacity = 0.1 + (Math.sin(i) + 1) * 0.1;

                this.ctx.globalAlpha = opacity;
                this.ctx.strokeStyle = `hsl(${hue}, 70%, 50%)`;
                this.ctx.lineWidth = 1;

                this.ctx.beginPath();
                this.ctx.moveTo(startX, startY + pathHeight / 2);

                for (let x = 0; x < pathWidth * pathProgress; x += 5) {
                    const randomOffset = Math.sin(x * 0.02 + i) * 30 +
                                       Math.cos(x * 0.015 + i * 0.5) * 20;
                    const y = startY + pathHeight / 2 + randomOffset - x * 0.1;
                    this.ctx.lineTo(startX + x, y);
                }

                this.ctx.stroke();
                this.ctx.globalAlpha = 1;
            }
        }

        // Results summary
        if (progress > 0.8) {
            const results = [
                'Success Rate: 85%',
                'Median Balance: $2.1M',
                'Risk of Depletion: 15%'
            ];

            results.forEach((result, index) => {
                const resultY = 450 + index * 25;
                this.drawText(result, 50, resultY, {
                    fontSize: 16,
                    color: index === 0 ? '#10b981' : '#1f2937',
                    fontWeight: index === 0 ? 'bold' : 'normal'
                });
            });
        }
    }

    animateAIRecommendations(progress) {
        this.clearCanvas();

        this.drawText('Step 4: AI Recommendations', 50, 50, {
            fontSize: 24,
            fontWeight: 'bold',
            color: '#1f2937'
        });

        // AI brain animation
        const brainX = 350;
        const brainY = 100;
        const brainSize = 40;

        this.drawCircle(brainX, brainY, brainSize, '#7c3aed', {
            stroke: true,
            strokeColor: '#5b21b6',
            strokeWidth: 2
        });

        // Animated neural connections
        if (progress > 0.3) {
            const connections = [
                { x1: brainX - 30, y1: brainY - 10, x2: brainX + 30, y2: brainY + 15 },
                { x1: brainX - 20, y1: brainY + 20, x2: brainX + 25, y2: brainY - 20 },
                { x1: brainX - 35, y1: brainY + 5, x2: brainX, y2: brainY - 30 }
            ];

            connections.forEach((conn, index) => {
                const connProgress = Math.max(0, (progress - 0.3 - index * 0.1) / 0.2);
                if (connProgress > 0) {
                    this.ctx.strokeStyle = '#a855f7';
                    this.ctx.lineWidth = 2;
                    this.ctx.globalAlpha = connProgress;

                    this.ctx.beginPath();
                    this.ctx.moveTo(conn.x1, conn.y1);
                    this.ctx.lineTo(
                        conn.x1 + (conn.x2 - conn.x1) * connProgress,
                        conn.y1 + (conn.y2 - conn.y1) * connProgress
                    );
                    this.ctx.stroke();
                    this.ctx.globalAlpha = 1;
                }
            });
        }

        // Recommendation categories
        const categories = [
            'Home Ownership Strategy',
            'Investment Property Timing',
            'Superannuation Optimization',
            'Trust Structure Analysis',
            'Asset Allocation Review',
            'Insurance Planning',
            'Tax Minimization',
            'Estate Planning'
        ];

        categories.forEach((category, index) => {
            const categoryProgress = Math.max(0, (progress - 0.4 - index * 0.05) / 0.1);
            if (categoryProgress > 0) {
                const x = 50;
                const y = 180 + index * 35;

                // Category background
                this.ctx.globalAlpha = categoryProgress;
                this.drawRect(x, y - 20, 500, 30, '#f0f9ff', {
                    radius: 6,
                    stroke: true,
                    strokeColor: '#3b82f6'
                });

                // Category text
                this.drawText(`✓ ${category}`, x + 10, y - 5, {
                    fontSize: 14,
                    color: '#1e40af'
                });

                // Confidence score
                const confidence = 75 + Math.floor(Math.random() * 20);
                this.drawText(`${confidence}%`, x + 450, y - 5, {
                    fontSize: 12,
                    color: '#059669',
                    fontWeight: 'bold'
                });

                this.ctx.globalAlpha = 1;
            }
        });

        // Summary
        if (progress > 0.9) {
            this.drawText('Analysis complete: 23 personalized recommendations generated', 50, 520, {
                fontSize: 16,
                color: '#10b981',
                fontWeight: 'bold'
            });
        }
    }

    animateResults(progress) {
        this.clearCanvas();

        this.drawText('Step 5: Results & Visualizations', 50, 50, {
            fontSize: 24,
            fontWeight: 'bold',
            color: '#1f2937'
        });

        // Animated charts
        if (progress > 0.2) {
            // Fan chart simulation
            const chartX = 50;
            const chartY = 100;
            const chartWidth = 300;
            const chartHeight = 150;

            this.drawRect(chartX, chartY, chartWidth, chartHeight, '#ffffff', {
                radius: 8,
                stroke: true,
                strokeColor: '#d1d5db'
            });

            this.drawText('Retirement Projection', chartX + 10, chartY + 25, {
                fontSize: 14,
                fontWeight: 'bold',
                color: '#1f2937'
            });

            // Draw fan chart paths
            const fanProgress = (progress - 0.2) / 0.3;
            if (fanProgress > 0) {
                const percentiles = [10, 25, 50, 75, 90];
                percentiles.forEach((percentile, index) => {
                    const color = `hsl(${220 + index * 20}, 70%, ${60 + index * 5}%)`;
                    this.ctx.strokeStyle = color;
                    this.ctx.lineWidth = 2;

                    this.ctx.beginPath();
                    this.ctx.moveTo(chartX + 20, chartY + chartHeight - 30);

                    for (let x = 0; x < chartWidth - 40; x += 5) {
                        const xProgress = x / (chartWidth - 40);
                        const baseY = chartY + chartHeight - 30 - xProgress * (chartHeight - 60);
                        const variance = (100 - percentile) * 0.5;
                        const y = baseY + Math.sin(xProgress * Math.PI * 2 + index) * variance * fanProgress;

                        if (xProgress <= fanProgress) {
                            this.ctx.lineTo(chartX + 20 + x, y);
                        }
                    }

                    this.ctx.stroke();
                });
            }
        }

        // Statistics panel
        if (progress > 0.5) {
            const statsX = 400;
            const statsY = 100;

            this.drawRect(statsX, statsY, 250, 200, '#f8fafc', {
                radius: 8,
                stroke: true,
                strokeColor: '#e2e8f0'
            });

            this.drawText('Key Metrics', statsX + 15, statsY + 30, {
                fontSize: 16,
                fontWeight: 'bold',
                color: '#1f2937'
            });

            const stats = [
                { label: 'Success Rate', value: '85%', color: '#10b981' },
                { label: 'Median Balance', value: '$2.1M', color: '#3b82f6' },
                { label: 'Years Funded', value: '32 years', color: '#8b5cf6' },
                { label: 'Risk Level', value: 'Moderate', color: '#f59e0b' }
            ];

            stats.forEach((stat, index) => {
                const statProgress = Math.max(0, (progress - 0.5 - index * 0.1) / 0.1);
                if (statProgress > 0) {
                    const y = statsY + 60 + index * 30;

                    this.ctx.globalAlpha = statProgress;
                    this.drawText(stat.label, statsX + 15, y, {
                        fontSize: 14,
                        color: '#6b7280'
                    });

                    this.drawText(stat.value, statsX + 200, y, {
                        fontSize: 14,
                        fontWeight: 'bold',
                        color: stat.color,
                        textAlign: 'right'
                    });
                    this.ctx.globalAlpha = 1;
                }
            });
        }

        // Recommendation preview
        if (progress > 0.8) {
            const recY = 320;
            this.drawText('Top Recommendations:', 50, recY, {
                fontSize: 16,
                fontWeight: 'bold',
                color: '#1f2937'
            });

            const recommendations = [
                'Consider salary sacrificing additional $5,000 to super',
                'Review investment property sale timing for optimal CGT',
                'Explore family trust structure for tax efficiency'
            ];

            recommendations.forEach((rec, index) => {
                const recProgress = Math.max(0, (progress - 0.8 - index * 0.05) / 0.05);
                if (recProgress > 0) {
                    this.ctx.globalAlpha = recProgress;
                    this.drawText(`• ${rec}`, 70, recY + 30 + index * 25, {
                        fontSize: 14,
                        color: '#4f46e5'
                    });
                    this.ctx.globalAlpha = 1;
                }
            });
        }
    }

    animateExport(progress) {
        this.clearCanvas();

        this.drawText('Step 6: Export & Share', 50, 50, {
            fontSize: 24,
            fontWeight: 'bold',
            color: '#1f2937'
        });

        // Document types
        const docs = [
            { name: 'PDF Report', color: '#dc2626', icon: 'PDF', desc: 'Professional comprehensive report' },
            { name: 'Excel Workbook', color: '#10b981', icon: 'XLS', desc: 'Detailed analysis spreadsheet' },
            { name: 'CSV Data', color: '#3b82f6', icon: 'CSV', desc: 'Raw data for further analysis' }
        ];

        docs.forEach((doc, index) => {
            const docProgress = Math.max(0, (progress - index * 0.2) / 0.3);
            if (docProgress > 0) {
                const x = 100 + index * 200;
                const y = 150;

                // Document icon
                this.ctx.globalAlpha = docProgress;
                this.drawRect(x, y, 80, 100, doc.color, { radius: 8 });

                this.drawText(doc.icon, x + 40, y + 55, {
                    fontSize: 16,
                    fontWeight: 'bold',
                    color: 'white',
                    textAlign: 'center'
                });

                // Document details
                this.drawText(doc.name, x + 40, y + 130, {
                    fontSize: 14,
                    fontWeight: 'bold',
                    color: '#1f2937',
                    textAlign: 'center'
                });

                this.drawText(doc.desc, x + 40, y + 150, {
                    fontSize: 12,
                    color: '#6b7280',
                    textAlign: 'center'
                });

                // Generation progress
                if (docProgress > 0.5) {
                    const genProgress = (docProgress - 0.5) / 0.5;
                    this.drawText('Generating...', x + 40, y + 180, {
                        fontSize: 10,
                        color: doc.color,
                        textAlign: 'center'
                    });

                    this.drawRect(x + 10, y + 190, 60, 6, '#e5e7eb', { radius: 3 });
                    this.drawRect(x + 10, y + 190, 60 * genProgress, 6, doc.color, { radius: 3 });

                    if (genProgress >= 1) {
                        this.drawText('✓ Ready', x + 40, y + 210, {
                            fontSize: 12,
                            color: '#10b981',
                            textAlign: 'center',
                            fontWeight: 'bold'
                        });
                    }
                }

                this.ctx.globalAlpha = 1;
            }
        });

        // Sharing options
        if (progress > 0.7) {
            this.drawText('Share with your financial advisor:', 50, 400, {
                fontSize: 16,
                color: '#1f2937'
            });

            const shareProgress = (progress - 0.7) / 0.3;
            this.ctx.globalAlpha = shareProgress;

            this.drawRect(50, 420, 500, 80, '#f0f9ff', {
                radius: 8,
                stroke: true,
                strokeColor: '#3b82f6'
            });

            this.drawText('📧 Email reports directly to your advisor', 70, 450, {
                fontSize: 14,
                color: '#1e40af'
            });

            this.drawText('💼 Professional format suitable for financial planning meetings', 70, 475, {
                fontSize: 14,
                color: '#1e40af'
            });

            this.ctx.globalAlpha = 1;
        }

        // Completion message
        if (progress > 0.9) {
            this.drawText('✅ Analysis complete! Your retirement plan is ready.', 50, 530, {
                fontSize: 16,
                fontWeight: 'bold',
                color: '#10b981'
            });
        }
    }

    showCompletionMessage() {
        this.clearCanvas();

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // Success checkmark
        this.drawCircle(centerX, centerY - 50, 50, '#10b981');
        this.drawText('✓', centerX, centerY - 35, {
            fontSize: 48,
            color: 'white',
            textAlign: 'center',
            fontWeight: 'bold'
        });

        this.drawText('Demo Complete!', centerX, centerY + 30, {
            fontSize: 32,
            fontWeight: 'bold',
            color: '#1f2937',
            textAlign: 'center'
        });

        this.drawText('Ready to try the Australian Retirement Calculator?', centerX, centerY + 70, {
            fontSize: 18,
            color: '#6b7280',
            textAlign: 'center'
        });

        // Add CTA button
        this.drawRect(centerX - 100, centerY + 100, 200, 50, '#4f46e5', { radius: 8 });
        this.drawText('Open Calculator', centerX, centerY + 130, {
            fontSize: 18,
            fontWeight: 'bold',
            color: 'white',
            textAlign: 'center'
        });
    }

    drawWelcomeScreen() {
        this.clearCanvas();

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        this.drawText('Australian Retirement Calculator Demo', centerX, centerY - 50, {
            fontSize: 28,
            fontWeight: 'bold',
            color: '#1f2937',
            textAlign: 'center'
        });

        this.drawText('Click "Play Demo" to see how the calculator works', centerX, centerY, {
            fontSize: 16,
            color: '#6b7280',
            textAlign: 'center'
        });

        this.drawText('Duration: ~30 seconds', centerX, centerY + 30, {
            fontSize: 14,
            color: '#9ca3af',
            textAlign: 'center'
        });
    }
}

// Initialize demo when page loads
document.addEventListener('DOMContentLoaded', () => {
    const demoCanvas = document.getElementById('animated-demo');
    if (demoCanvas) {
        window.animatedDemo = new AnimatedDemo('animated-demo');
        window.animatedDemo.drawWelcomeScreen();
    }
});