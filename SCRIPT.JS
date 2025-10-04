// ===== TRIP TRACKER PRO APP =====
class TripTracker {
    constructor() {
        this.currentUser = null;
        this.trips = JSON.parse(localStorage.getItem('trips')) || [];
        this.userData = JSON.parse(localStorage.getItem('userData')) || this.getDefaultUserData();
        this.settings = JSON.parse(localStorage.getItem('settings')) || this.getDefaultSettings();
        this.currentScreen = 'splashScreen';
        this.currentAppScreen = 'homeScreen';
        this.currentTab = 'overview';
        this.currentTransport = 'walk';
        this.selectedTripId = null;
        this.filters = {
            transport: 'all',
            date: 'all',
            sort: 'date-desc'
        };
        this.onboardingSlide = 0;
        this.charts = {};
        
        // Map & SOS properties
        this.trackingWatchId = null;
        this.trackingInterval = null;
        this.trackingStartTime = null;
        this.trackedPositions = [];
        this.sosCountdown = null;
        this.sosTimer = 30;
        this.sosLocation = null;
        this.isTracking = false;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateDateTime();
        this.loadUserData();
        this.applyTheme(this.settings.theme);
        this.updateAllSwitches();
        this.setupDefaultDates();
        
        // Add sample data if empty
        if (this.trips.length === 0) {
            this.trips = this.getSampleTrips();
            this.saveTrips();
        }
        
        // Initialize with demo data
        this.updateUserStats();
        
        setInterval(() => this.updateDateTime(), 60000);
        
        // Auto navigate from splash screen
        setTimeout(() => {
            if (this.currentScreen === 'splashScreen') {
                this.showOnboarding();
            }
        }, 3000);
    }

    getSampleTrips() {
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        
        return [
            {
                id: 1,
                title: "Morning Walk",
                startLocation: "Home",
                endLocation: "Central Park",
                transport: "walk",
                distance: 2.5,
                duration: 30,
                co2: 0,
                ecoPoints: 25,
                date: now.toISOString(),
                notes: "Beautiful morning walk through the park",
                timestamp: now.getTime()
            },
            {
                id: 2,
                title: "Office Commute",
                startLocation: "Home",
                endLocation: "Downtown Office",
                transport: "bus",
                distance: 8.2,
                duration: 25,
                co2: 0.8,
                ecoPoints: 32,
                date: yesterday.toISOString(),
                notes: "Regular office commute",
                timestamp: yesterday.getTime()
            },
            {
                id: 3,
                title: "Weekend Cycling",
                startLocation: "Apartment",
                endLocation: "Lake View",
                transport: "cycle",
                distance: 15.7,
                duration: 45,
                co2: 0,
                ecoPoints: 125,
                date: new Date(now.getTime() - 2 * 86400000).toISOString(),
                notes: "Great weekend exercise",
                timestamp: now.getTime() - 2 * 86400000
            }
        ];
    }

    getDefaultUserData() {
        return {
            name: "Traveler",
            email: "traveler@triptracker.com",
            joinDate: new Date().getFullYear(),
            stats: {
                totalTrips: 0,
                totalDistance: 0,
                totalCO2: 0,
                ecoPoints: 0,
                treesSaved: 0,
                monthlyGoal: 1000
            },
            badges: []
        };
    }

    getDefaultSettings() {
        return {
            theme: 'light',
            notifications: true,
            locationTracking: false,
            autoSave: true
        };
    }

    // ===== THEME MANAGEMENT =====
    toggleTheme() {
        this.settings.theme = this.settings.theme === 'light' ? 'dark' : 'light';
        this.applyTheme(this.settings.theme);
        this.saveSettings();
        this.updateThemeButton();
        this.updateThemeSwitch();
        this.showToast(`Switched to ${this.settings.theme} mode`, 'info');
    }

    applyTheme(theme) {
        document.body.className = theme + '-mode';
    }

    updateThemeButton() {
        const themeBtn = document.getElementById('themeBtn');
        if (themeBtn) {
            themeBtn.innerHTML = this.settings.theme === 'light' ? 
                '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
        }
    }

    updateThemeSwitch() {
        const themeSwitch = document.getElementById('themeSwitch');
        if (themeSwitch) {
            themeSwitch.checked = this.settings.theme === 'dark';
        }
    }

    updateAllSwitches() {
        const switches = {
            'notificationsSwitch': this.settings.notifications,
            'locationSwitch': this.settings.locationTracking,
            'themeSwitch': this.settings.theme === 'dark'
        };

        Object.entries(switches).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.checked = value;
            }
        });
    }

    // ===== SCREEN NAVIGATION =====
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        const screenElement = document.getElementById(screenId);
        if (screenElement) {
            screenElement.classList.add('active');
            this.currentScreen = screenId;
        }
    }

    showAppScreen(screenId) {
        document.querySelectorAll('.app-screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        const screenElement = document.getElementById(screenId);
        if (screenElement) {
            screenElement.classList.add('active');
            this.currentAppScreen = screenId;
            
            this.updateNavigation(screenId);
            
            // Refresh data when switching screens
            this.refreshScreenData(screenId);
        }
    }

    refreshScreenData(screenId) {
        switch(screenId) {
            case 'homeScreen':
                this.updateDashboard();
                break;
            case 'historyScreen':
                this.updateHistoryView();
                break;
            case 'profileScreen':
                this.updateProfileStats();
                this.updateBadges();
                break;
            case 'analyticsScreen':
                this.updateAnalytics();
                break;
            case 'addTripScreen':
                this.updateTripPreview();
                break;
            case 'mapScreen':
                this.initMap();
                break;
        }
    }

    updateNavigation(screenId) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const navMap = {
            'homeScreen': '.nav-item:nth-child(1)',
            'historyScreen': '.nav-item:nth-child(2)',
            'mapScreen': '.nav-item:nth-child(3)',
            'analyticsScreen': '.nav-item:nth-child(5)',
            'profileScreen': '.nav-item:nth-child(6)'
        };
        
        if (navMap[screenId]) {
            const navItem = document.querySelector(navMap[screenId]);
            if (navItem) {
                navItem.classList.add('active');
            }
        }
    }

    // ===== ONBOARDING =====
    nextOnboardingSlide() {
        const slides = document.querySelectorAll('.onboarding-slide');
        const dots = document.querySelectorAll('.onboarding-dots .dot');
        
        if (slides[this.onboardingSlide]) {
            slides[this.onboardingSlide].classList.remove('active');
            dots[this.onboardingSlide].classList.remove('active');
        }
        
        this.onboardingSlide++;
        
        if (this.onboardingSlide >= slides.length) {
            this.showLogin();
            return;
        }
        
        if (slides[this.onboardingSlide]) {
            slides[this.onboardingSlide].classList.add('active');
            dots[this.onboardingSlide].classList.add('active');
        }
    }

    skipOnboarding() {
        this.showLogin();
    }

    // ===== USER AUTHENTICATION =====
    login() {
        const email = document.getElementById('loginEmail')?.value;
        const password = document.getElementById('loginPassword')?.value;
        
        if (!email || !password) {
            this.showToast('Please fill in all fields', 'error');
            return;
        }

        this.showLoading('login');
        
        // Simulate API call
        setTimeout(() => {
            this.currentUser = {
                email: email,
                name: email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1)
            };
            this.userData.name = this.currentUser.name;
            this.userData.email = this.currentUser.email;
            this.saveUserData();
            
            this.hideLoading('login');
            this.showApp();
            this.showToast('Welcome back! 👋', 'success');
        }, 1500);
    }

    signup() {
        const name = document.getElementById('signupName')?.value;
        const email = document.getElementById('signupEmail')?.value;
        const password = document.getElementById('signupPassword')?.value;
        
        if (!name || !email || !password) {
            this.showToast('Please fill in all fields', 'error');
            return;
        }

        if (password.length < 6) {
            this.showToast('Password must be at least 6 characters', 'error');
            return;
        }

        this.showLoading('signup');
        
        // Simulate API call
        setTimeout(() => {
            this.currentUser = { name, email };
            this.userData.name = name;
            this.userData.email = email;
            this.userData.joinDate = new Date().getFullYear();
            this.saveUserData();
            
            this.hideLoading('signup');
            this.showApp();
            this.showToast('Account created successfully! 🎉', 'success');
        }, 1500);
    }

    socialLogin(provider) {
        this.showToast(`Signing in with ${provider}...`, 'info');
        
        setTimeout(() => {
            this.currentUser = {
                email: `user@${provider}.com`,
                name: `${provider.charAt(0).toUpperCase() + provider.slice(1)} User`
            };
            this.userData.name = this.currentUser.name;
            this.userData.email = this.currentUser.email;
            this.userData.joinDate = new Date().getFullYear();
            this.saveUserData();
            
            this.showApp();
            this.showToast(`Welcome! Signed in with ${provider}`, 'success');
        }, 2000);
    }

    logout() {
        this.currentUser = null;
        this.showScreen('loginScreen');
        this.showToast('Signed out successfully', 'info');
    }

    // ===== TRIP MANAGEMENT =====
    selectTransport(transport) {
        this.currentTransport = transport;
        document.querySelectorAll('.transport-option').forEach(option => {
            option.classList.remove('active');
        });
        
        const selectedOption = document.querySelector(`.transport-option[data-mode="${transport}"]`);
        if (selectedOption) {
            selectedOption.classList.add('active');
        }
        
        this.updateTripPreview();
    }

    setupDefaultDates() {
        const now = new Date();
        const dateInput = document.getElementById('tripDate');
        const timeInput = document.getElementById('tripTime');
        
        if (dateInput) {
            dateInput.value = now.toISOString().split('T')[0];
        }
        if (timeInput) {
            timeInput.value = now.toTimeString().slice(0, 5);
        }
    }

    useCurrentLocation() {
        if (navigator.geolocation) {
            this.showToast('Getting your current location...', 'info');
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    document.getElementById('startLocation').value = 'Current Location';
                    this.updateTripPreview();
                    this.showToast('Current location set', 'success');
                },
                (error) => {
                    this.showToast('Could not get current location', 'error');
                    document.getElementById('startLocation').value = 'Current Location';
                    this.updateTripPreview();
                }
            );
        } else {
            this.showToast('Geolocation not supported', 'error');
            document.getElementById('startLocation').value = 'Current Location';
            this.updateTripPreview();
        }
    }

    calculateDistance() {
        const start = document.getElementById('startLocation')?.value;
        const end = document.getElementById('endLocation')?.value;
        
        if (!start || !end) {
            this.showToast('Please enter both start and end locations', 'warning');
            return;
        }

        // Simulate distance calculation based on transport mode
        const baseDistance = {
            'walk': 1.5,
            'cycle': 5,
            'bus': 8,
            'train': 15,
            'car': 10,
            'flight': 200
        }[this.currentTransport] || 5;

        // Add some randomness for realism
        const calculatedDistance = (baseDistance + Math.random() * 5).toFixed(1);
        
        document.getElementById('tripDistance').value = calculatedDistance;
        
        // Auto-calculate duration based on transport mode
        const speed = this.getTransportSpeed(this.currentTransport);
        const duration = Math.round((calculatedDistance / speed) * 60);
        document.getElementById('tripDuration').value = duration;
        
        this.updateTripPreview();
        this.showToast(`Distance calculated: ${calculatedDistance} km`, 'success');
    }

    getTransportSpeed(transport) {
        const speeds = {
            'walk': 5,
            'cycle': 15,
            'bus': 25,
            'train': 60,
            'car': 40,
            'flight': 800
        };
        return speeds[transport] || 20;
    }

    saveTrip(event) {
        if (event) {
            event.preventDefault();
        }
        
        const title = document.getElementById('tripTitle')?.value;
        const startLocation = document.getElementById('startLocation')?.value;
        const endLocation = document.getElementById('endLocation')?.value;
        const distance = parseFloat(document.getElementById('tripDistance')?.value);
        const duration = parseInt(document.getElementById('tripDuration')?.value) || 0;
        const date = document.getElementById('tripDate')?.value;
        const time = document.getElementById('tripTime')?.value;
        const notes = document.getElementById('tripNotes')?.value;
        
        if (!this.validateTripForm(title, startLocation, endLocation, distance, date, time)) {
            return;
        }

        const co2 = this.calculateCO2(this.currentTransport, distance);
        const ecoPoints = this.calculateEcoPoints(this.currentTransport, distance);
        
        const trip = {
            id: this.selectedTripId || Date.now(),
            title,
            startLocation,
            endLocation,
            transport: this.currentTransport,
            distance,
            duration,
            co2,
            ecoPoints,
            date: `${date}T${time}`,
            notes,
            timestamp: new Date().getTime()
        };

        if (this.selectedTripId) {
            // Update existing trip
            const index = this.trips.findIndex(t => t.id === this.selectedTripId);
            if (index !== -1) {
                this.trips[index] = trip;
                this.showToast('Trip updated successfully! ✏️', 'success');
            }
        } else {
            // Add new trip
            this.trips.unshift(trip);
            this.showToast('Trip saved successfully! 🎉', 'success');
        }

        this.saveTrips();
        this.updateUserStats();
        this.showAppScreen('homeScreen');
        this.resetForm();
        this.selectedTripId = null;
    }

    validateTripForm(title, start, end, distance, date, time) {
        if (!title?.trim()) {
            this.showToast('Please enter a trip title', 'error');
            return false;
        }
        if (!start?.trim()) {
            this.showToast('Please enter start location', 'error');
            return false;
        }
        if (!end?.trim()) {
            this.showToast('Please enter end location', 'error');
            return false;
        }
        if (!distance || distance <= 0) {
            this.showToast('Please enter a valid distance', 'error');
            return false;
        }
        if (!date) {
            this.showToast('Please select a date', 'error');
            return false;
        }
        if (!time) {
            this.showToast('Please select a time', 'error');
            return false;
        }
        return true;
    }

    calculateCO2(transport, distance) {
        const factors = {
            'walk': 0,
            'cycle': 0,
            'bus': 0.1,
            'train': 0.05,
            'car': 0.2,
            'flight': 0.3
        };
        return parseFloat((distance * (factors[transport] || 0.1)).toFixed(2));
    }

    calculateEcoPoints(transport, distance) {
        const multipliers = {
            'walk': 10,
            'cycle': 8,
            'bus': 4,
            'train': 5,
            'car': 1,
            'flight': 0.5
        };
        return Math.floor(distance * (multipliers[transport] || 1));
    }

    updateTripPreview() {
        const preview = document.getElementById('tripPreview');
        if (!preview) return;

        const title = document.getElementById('tripTitle')?.value;
        const startLocation = document.getElementById('startLocation')?.value;
        const endLocation = document.getElementById('endLocation')?.value;
        const distance = document.getElementById('tripDistance')?.value;
        const duration = document.getElementById('tripDuration')?.value;
        const date = document.getElementById('tripDate')?.value;
        const time = document.getElementById('tripTime')?.value;
        const notes = document.getElementById('tripNotes')?.value;
        
        if (!title && !startLocation && !endLocation && !distance) {
            preview.innerHTML = `
                <div class="preview-placeholder">
                    <i class="fas fa-route"></i>
                    <p>Fill the form to see trip preview</p>
                </div>
            `;
            return;
        }
        
        const co2 = this.calculateCO2(this.currentTransport, distance || 0);
        const points = this.calculateEcoPoints(this.currentTransport, distance || 0);
        
        preview.innerHTML = `
            <div class="trip-preview-content">
                <div class="preview-header">
                    <h4>${title || 'Untitled Trip'}</h4>
                    <div class="transport-badge ${this.currentTransport}">
                        <i class="fas fa-${this.getTransportIcon(this.currentTransport)}"></i>
                        ${this.currentTransport.charAt(0).toUpperCase() + this.currentTransport.slice(1)}
                    </div>
                </div>
                <div class="preview-route">
                    <span class="start">${startLocation || 'Start'}</span>
                    <i class="fas fa-arrow-right"></i>
                    <span class="end">${endLocation || 'End'}</span>
                </div>
                ${distance ? `
                <div class="preview-stats">
                    <div class="preview-stat">
                        <span class="label">Distance:</span>
                        <span class="value">${distance} km</span>
                    </div>
                    <div class="preview-stat">
                        <span class="label">Duration:</span>
                        <span class="value">${duration || '?'} mins</span>
                    </div>
                    <div class="preview-stat">
                        <span class="label">CO₂ Impact:</span>
                        <span class="value">${co2} kg</span>
                    </div>
                    <div class="preview-stat">
                        <span class="label">Eco Points:</span>
                        <span class="value">+${points}</span>
                    </div>
                </div>
                ` : ''}
            </div>
        `;
    }

    resetForm() {
        const form = document.getElementById('tripForm');
        if (form) {
            form.reset();
        }
        this.setupDefaultDates();
        this.selectTransport('walk');
        this.updateTripPreview();
    }

    // ===== DASHBOARD UPDATES =====
    updateDashboard() {
        this.updateHomeStats();
        this.updateRecentTrips();
        this.updateEcoImpact();
    }

    updateHomeStats() {
        const stats = this.userData.stats;
        
        this.updateElementText('totalTrips', stats.totalTrips);
        this.updateElementText('totalDistance', Math.round(stats.totalDistance));
        this.updateElementText('ecoPoints', stats.ecoPoints);

        // Update trends
        this.updateElementText('tripsTrend', stats.totalTrips > 0 ? '+12%' : '+0%');
        this.updateElementText('distanceTrend', stats.totalDistance > 0 ? '+8%' : '+0%');
        this.updateElementText('pointsTrend', stats.ecoPoints > 0 ? '+15%' : '+0%');
    }

    updateRecentTrips() {
        const container = document.getElementById('recentTripsList');
        if (!container) return;

        const recentTrips = this.trips.slice(0, 3);
        
        if (recentTrips.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-route"></i>
                    <p>No trips yet. Start by adding your first trip!</p>
                    <button class="btn-primary" onclick="app.showAddTrip()" style="margin-top: 1rem;">
                        <i class="fas fa-plus"></i>
                        Add First Trip
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = recentTrips.map(trip => `
            <div class="trip-item" onclick="app.showTripDetails(${trip.id})">
                <div class="trip-icon ${trip.transport}">
                    <i class="fas fa-${this.getTransportIcon(trip.transport)}"></i>
                </div>
                <div class="trip-info">
                    <h4>${trip.title}</h4>
                    <div class="trip-meta">
                        <span>${trip.distance} km</span>
                        <span>${trip.co2} kg CO₂</span>
                    </div>
                </div>
                <div class="trip-date">${this.formatDate(trip.date)}</div>
            </div>
        `).join('');
    }

    updateEcoImpact() {
        const stats = this.userData.stats;
        
        this.updateElementText('co2Saved', stats.totalCO2.toFixed(1));
        this.updateElementText('treesSaved', stats.treesSaved);
        
        const progress = Math.min((stats.ecoPoints / stats.monthlyGoal) * 100, 100);
        const progressFill = document.getElementById('ecoProgress');
        if (progressFill) {
            progressFill.style.width = progress + '%';
        }
        this.updateElementText('progressPercent', Math.round(progress) + '%');
    }

    updateUserStats() {
        const stats = {
            totalTrips: this.trips.length,
            totalDistance: this.trips.reduce((sum, trip) => sum + trip.distance, 0),
            totalCO2: this.trips.reduce((sum, trip) => sum + trip.co2, 0),
            ecoPoints: this.trips.reduce((sum, trip) => sum + trip.ecoPoints, 0),
            treesSaved: (this.trips.reduce((sum, trip) => sum + trip.co2, 0) / 21.77).toFixed(1),
            monthlyGoal: this.userData.stats.monthlyGoal || 1000
        };

        this.userData.stats = stats;
        this.checkBadges();
        this.saveUserData();
        this.updateDashboard();
    }

    // ===== HISTORY & FILTERS =====
    filterTrips() {
        const transportFilter = document.getElementById('transportFilter')?.value;
        const dateFilter = document.getElementById('dateFilter')?.value;
        
        this.filters.transport = transportFilter || 'all';
        this.filters.date = dateFilter || 'all';
        
        this.updateHistoryView();
    }

    updateHistoryView() {
        let filteredTrips = this.filterTripsByCriteria();
        this.sortTrips(filteredTrips);
        this.renderTripsList(filteredTrips);
        this.updateHistoryStats(filteredTrips);
    }

    filterTripsByCriteria() {
        let filteredTrips = [...this.trips];
        
        // Transport filter
        if (this.filters.transport !== 'all') {
            filteredTrips = filteredTrips.filter(trip => trip.transport === this.filters.transport);
        }
        
        // Date filter
        if (this.filters.date !== 'all') {
            filteredTrips = filteredTrips.filter(trip => {
                const tripDate = new Date(trip.date);
                const now = new Date();
                
                switch (this.filters.date) {
                    case 'today':
                        return this.isSameDay(tripDate, now);
                    case 'week':
                        return this.isSameWeek(tripDate, now);
                    case 'month':
                        return this.isSameMonth(tripDate, now);
                    case 'year':
                        return tripDate.getFullYear() === now.getFullYear();
                    default:
                        return true;
                }
            });
        }
        
        return filteredTrips;
    }

    sortTrips(trips) {
        if (this.filters.sort === 'date-desc') {
            trips.sort((a, b) => new Date(b.date) - new Date(a.date));
        } else {
            trips.sort((a, b) => new Date(a.date) - new Date(b.date));
        }
    }

    renderTripsList(trips) {
        const container = document.getElementById('tripsList');
        if (!container) return;
        
        if (trips.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-route"></i>
                    <p>No trips found matching your filters</p>
                </div>
            `;
            return;
        }

        container.innerHTML = trips.map(trip => `
            <div class="trip-item" onclick="app.showTripDetails(${trip.id})">
                <div class="trip-icon ${trip.transport}">
                    <i class="fas fa-${this.getTransportIcon(trip.transport)}"></i>
                </div>
                <div class="trip-info">
                    <h4>${trip.title}</h4>
                    <div class="trip-meta">
                        <span>${trip.startLocation} → ${trip.endLocation}</span>
                        <span>${trip.distance} km • ${trip.co2} kg CO₂</span>
                    </div>
                </div>
                <div class="trip-date">${this.formatDate(trip.date)}</div>
            </div>
        `).join('');
    }

    updateHistoryStats(trips) {
        const totalTrips = trips.length;
        const totalDistance = trips.reduce((sum, trip) => sum + trip.distance, 0);
        const totalCO2 = trips.reduce((sum, trip) => sum + parseFloat(trip.co2), 0);
        
        this.updateElementText('filteredTrips', totalTrips);
        this.updateElementText('filteredDistance', Math.round(totalDistance));
        this.updateElementText('filteredCO2', totalCO2.toFixed(1));
    }

    toggleSort() {
        const sortIcon = document.getElementById('sortIcon');
        this.filters.sort = this.filters.sort === 'date-desc' ? 'date-asc' : 'date-desc';
        
        if (this.filters.sort === 'date-desc') {
            if (sortIcon) sortIcon.className = 'fas fa-sort-amount-down';
            this.showToast('Sorted by: Newest first', 'info');
        } else {
            if (sortIcon) sortIcon.className = 'fas fa-sort-amount-up';
            this.showToast('Sorted by: Oldest first', 'info');
        }
        
        this.updateHistoryView();
    }

    clearAllTrips() {
        if (this.trips.length === 0) {
            this.showToast('No trips to clear', 'info');
            return;
        }

        if (confirm('Are you sure you want to delete ALL trips? This action cannot be undone.')) {
            this.trips = [];
            this.saveTrips();
            this.updateUserStats();
            this.showToast('All trips cleared successfully', 'success');
        }
    }

    // ===== ANALYTICS =====
    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        const tabBtn = document.querySelector(`[onclick="app.switchTab('${tabName}')"]`);
        const tabContent = document.getElementById(tabName + 'Tab');
        
        if (tabBtn) tabBtn.classList.add('active');
        if (tabContent) tabContent.classList.add('active');
        
        this.currentTab = tabName;
        this.updateAnalytics();
    }

    updateAnalytics() {
        switch(this.currentTab) {
            case 'overview':
                this.updateOverviewCharts();
                break;
            case 'transport':
                this.updateTransportCharts();
                break;
            case 'environment':
                this.updateEnvironmentCharts();
                break;
        }
    }

    updateOverviewCharts() {
        this.createWeeklyChart();
        this.updateMonthlySummary();
    }

    createWeeklyChart() {
        const ctx = document.getElementById('weeklyChart');
        if (!ctx) return;

        // Destroy existing chart if it exists
        if (this.charts.weekly) {
            this.charts.weekly.destroy();
        }

        const weekData = this.getWeeklyData();
        
        this.charts.weekly = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Distance (km)',
                    data: weekData.distances,
                    backgroundColor: '#6366f1',
                    borderColor: '#4f46e5',
                    borderWidth: 1,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    getWeeklyData() {
        // Generate realistic weekly data based on actual trips
        const distances = [0, 0, 0, 0, 0, 0, 0];
        const now = new Date();
        
        this.trips.forEach(trip => {
            const tripDate = new Date(trip.date);
            const daysAgo = Math.floor((now - tripDate) / (1000 * 60 * 60 * 24));
            if (daysAgo >= 0 && daysAgo < 7) {
                const dayIndex = (6 - daysAgo) % 7;
                distances[dayIndex] += trip.distance;
            }
        });

        // If no recent trips, show sample data
        if (distances.every(d => d === 0)) {
            return { distances: [12, 8, 15, 6, 20, 5, 10] };
        }

        return { distances };
    }

    updateMonthlySummary() {
        const monthlyData = this.getMonthlyData();
        
        this.updateElementText('monthlyTrips', monthlyData.trips);
        this.updateElementText('monthlyDistance', `${monthlyData.distance} km`);
        this.updateElementText('monthlyCO2', `${monthlyData.co2} kg`);
    }

    getMonthlyData() {
        const now = new Date();
        const monthlyTrips = this.trips.filter(trip => 
            this.isSameMonth(new Date(trip.date), now)
        );
        
        return {
            trips: monthlyTrips.length,
            distance: Math.round(monthlyTrips.reduce((sum, trip) => sum + trip.distance, 0)),
            co2: monthlyTrips.reduce((sum, trip) => sum + trip.co2, 0).toFixed(1)
        };
    }

    updateTransportCharts() {
        this.createTransportChart();
    }

    createTransportChart() {
        const ctx = document.getElementById('transportChart');
        if (!ctx) return;

        if (this.charts.transport) {
            this.charts.transport.destroy();
        }

        const transportData = this.getTransportDistribution();
        
        this.charts.transport = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(transportData).map(key => 
                    key.charAt(0).toUpperCase() + key.slice(1)
                ),
                datasets: [{
                    data: Object.values(transportData),
                    backgroundColor: [
                        '#6366f1',
                        '#06b6d4',
                        '#f59e0b',
                        '#8b5cf6',
                        '#ef4444',
                        '#3b82f6'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                },
                cutout: '60%'
            }
        });
    }

    getTransportDistribution() {
        const distribution = { walk: 0, cycle: 0, bus: 0, train: 0, car: 0, flight: 0 };
        this.trips.forEach(trip => {
            distribution[trip.transport] = (distribution[trip.transport] || 0) + 1;
        });
        return distribution;
    }

    updateEnvironmentCharts() {
        this.createCO2Chart();
        this.updateEnvironmentalImpact();
    }

    createCO2Chart() {
        const ctx = document.getElementById('co2Chart');
        if (!ctx) return;

        if (this.charts.co2) {
            this.charts.co2.destroy();
        }

        const monthlyCO2 = this.getMonthlyCO2Data();
        
        this.charts.co2 = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Object.keys(monthlyCO2),
                datasets: [{
                    label: 'CO₂ Emissions (kg)',
                    data: Object.values(monthlyCO2),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    getMonthlyCO2Data() {
        // Generate CO2 data based on actual trips
        const monthly = {};
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const now = new Date();
        
        months.forEach((month, index) => {
            const monthTrips = this.trips.filter(trip => {
                const tripDate = new Date(trip.date);
                return tripDate.getMonth() === index && tripDate.getFullYear() === now.getFullYear();
            });
            
            monthly[month] = monthTrips.reduce((sum, trip) => sum + trip.co2, 0);
        });

        return monthly;
    }

    updateEnvironmentalImpact() {
        const totalCO2 = this.userData.stats.totalCO2;
        
        const treesSaved = (totalCO2 / 21.77).toFixed(1);
        const carsEquivalent = (totalCO2 / 4600).toFixed(2);
        const energySaved = (totalCO2 * 2.5).toFixed(0);
        
        this.updateElementText('treesCount', treesSaved);
        this.updateElementText('carsCount', carsEquivalent);
        this.updateElementText('energyCount', energySaved);
    }

    refreshAnalytics() {
        this.updateAnalytics();
        this.showToast('Analytics refreshed', 'success');
    }

    // ===== BADGES & PROFILE =====
    checkBadges() {
        const stats = this.userData.stats;
        const badges = new Set(this.userData.badges.map(b => b.id));
        const newBadges = [];

        if (stats.totalTrips >= 1 && !badges.has('first_trip')) {
            newBadges.push({ 
                id: 'first_trip', 
                name: 'First Journey', 
                icon: 'fas fa-map', 
                description: 'Logged your first trip' 
            });
        }
        if (stats.totalTrips >= 10 && !badges.has('explorer')) {
            newBadges.push({ 
                id: 'explorer', 
                name: 'Explorer', 
                icon: 'fas fa-route', 
                description: 'Completed 10 trips' 
            });
        }
        if (stats.totalDistance >= 100 && !badges.has('distance_master')) {
            newBadges.push({ 
                id: 'distance_master', 
                name: 'Distance Master', 
                icon: 'fas fa-road', 
                description: 'Traveled 100 km' 
            });
        }
        if (stats.ecoPoints >= 500 && !badges.has('eco_warrior')) {
            newBadges.push({ 
                id: 'eco_warrior', 
                name: 'Eco Warrior', 
                icon: 'fas fa-leaf', 
                description: 'Earned 500 eco points' 
            });
        }

        newBadges.forEach(badge => {
            this.userData.badges.push({ 
                ...badge, 
                earned: true, 
                earnedAt: new Date().toISOString() 
            });
            this.showToast(`New badge earned: ${badge.name}! 🏆`, 'success');
        });

        this.saveUserData();
    }

    updateProfileStats() {
        const stats = this.userData.stats;
        
        this.updateElementText('profileTotalTrips', stats.totalTrips);
        this.updateElementText('profileTotalDistance', Math.round(stats.totalDistance));
        this.updateElementText('profileTotalCO2', stats.totalCO2.toFixed(1));
        this.updateElementText('profileEcoPoints', stats.ecoPoints);
        this.updateElementText('profileName', this.userData.name);
        this.updateElementText('profileEmail', this.userData.email);
        this.updateElementText('memberSince', this.userData.joinDate);
    }

    updateBadges() {
        const container = document.getElementById('badgesGrid');
        if (!container) return;

        const badges = this.userData.badges;
        
        if (badges.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-trophy"></i>
                    <p>No badges earned yet. Keep traveling to earn badges!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = badges.map(badge => `
            <div class="badge-item earned">
                <div class="badge-icon">
                    <i class="${badge.icon}"></i>
                </div>
                <div class="badge-name">${badge.name}</div>
                <div class="badge-description">${badge.description}</div>
            </div>
        `).join('');
    }

    // ===== SETTINGS =====
    toggleNotifications() {
        this.settings.notifications = !this.settings.notifications;
        this.saveSettings();
        this.updateAllSwitches();
        this.showToast(`Notifications ${this.settings.notifications ? 'enabled' : 'disabled'}`, 'info');
    }

    toggleLocationTracking() {
        this.settings.locationTracking = !this.settings.locationTracking;
        this.saveSettings();
        this.updateAllSwitches();
        this.showToast(`Location tracking ${this.settings.locationTracking ? 'enabled' : 'disabled'}`, 'info');
    }

    // ===== MAP & SOS FUNCTIONALITY =====
    showMapScreen() {
        this.showAppScreen('mapScreen');
        this.initMap();
    }

    showSOSScreen() {
        this.showScreen('sosScreen');
        this.startSOSSequence();
    }

    // Map functionality
    initMap() {
        console.log('Map initialized');
        this.updateMapButtons(false);
        
        // Show map visualization placeholder
        const mapVisualization = document.getElementById('mapVisualization');
        const mapPlaceholder = document.querySelector('.map-placeholder');
        
        if (mapVisualization && mapPlaceholder) {
            mapPlaceholder.style.display = 'none';
            mapVisualization.style.display = 'block';
        }
    }

    startTracking() {
        if (!navigator.geolocation) {
            this.showToast('Geolocation is not supported by your browser', 'error');
            return;
        }

        this.showToast('Starting live tracking...', 'info');
        this.updateMapButtons(true);
        this.isTracking = true;
        
        // Start tracking position
        this.trackingWatchId = navigator.geolocation.watchPosition(
            (position) => this.updatePosition(position),
            (error) => this.handlePositionError(error),
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );

        this.trackingStartTime = Date.now();
        this.trackingInterval = setInterval(() => this.updateTrackingTime(), 1000);
        this.trackedPositions = [];
    }

    stopTracking() {
        if (this.trackingWatchId) {
            navigator.geolocation.clearWatch(this.trackingWatchId);
            this.trackingWatchId = null;
        }
        
        if (this.trackingInterval) {
            clearInterval(this.trackingInterval);
            this.trackingInterval = null;
        }

        this.updateMapButtons(false);
        this.isTracking = false;
        this.showToast('Tracking stopped', 'info');
        
        // Save the tracked trip
        if (this.trackedPositions.length > 0) {
            this.saveTrackedTrip();
        }
    }

    updatePosition(position) {
        const { latitude, longitude, accuracy, speed } = position.coords;
        
        // Add to tracked positions
        this.trackedPositions.push({
            lat: latitude,
            lng: longitude,
            timestamp: Date.now(),
            accuracy: accuracy,
            speed: speed
        });

        // Update UI
        this.updateLiveStats(position);
        this.updateMapPosition(latitude, longitude);
    }

    updateLiveStats(position) {
        const coords = position.coords;
        
        // Calculate distance
        let totalDistance = 0;
        if (this.trackedPositions.length > 1) {
            for (let i = 1; i < this.trackedPositions.length; i++) {
                totalDistance += this.calculateDistance(
                    this.trackedPositions[i-1].lat,
                    this.trackedPositions[i-1].lng,
                    this.trackedPositions[i].lat,
                    this.trackedPositions[i].lng
                );
            }
        }
        
        // Update distance
        this.updateElementText('liveDistance', totalDistance.toFixed(2) + ' km');
        
        // Update speed (convert m/s to km/h)
        const speedKmh = coords.speed ? (coords.speed * 3.6).toFixed(1) : '0';
        this.updateElementText('liveSpeed', speedKmh + ' km/h');
        
        // Update location info
        this.reverseGeocode(coords.latitude, coords.longitude).then(address => {
            this.updateElementText('currentPoint', address);
            
            if (this.trackedPositions.length === 1) {
                this.updateElementText('startPoint', address);
            }
        });
    }

    updateTrackingTime() {
        if (!this.trackingStartTime) return;
        
        const elapsed = Math.floor((Date.now() - this.trackingStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        
        this.updateElementText('liveDuration', 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }

    updateMapButtons(tracking) {
        const startBtn = document.getElementById('startTrackingBtn');
        const stopBtn = document.getElementById('stopTrackingBtn');
        
        if (startBtn && stopBtn) {
            if (tracking) {
                startBtn.style.display = 'none';
                stopBtn.style.display = 'flex';
            } else {
                startBtn.style.display = 'flex';
                stopBtn.style.display = 'none';
            }
        }
    }

    centerMap() {
        this.showToast('Centering map on your location', 'info');
        // In real implementation, this would center the map
    }

    toggleSatellite() {
        this.showToast('Switching map view', 'info');
        // In real implementation, this would toggle map style
    }

    // SOS functionality
    startSOSSequence() {
        this.sosStartTime = Date.now();
        this.sosTimer = 30;
        this.updateSOSTimer();
        
        // Get current location for SOS
        this.getCurrentLocation().then(location => {
            this.updateElementText('sosLocation', location.address);
            this.sosLocation = location;
        }).catch(error => {
            this.updateElementText('sosLocation', 'Location unavailable');
            this.sosLocation = { address: 'Location unavailable', lat: 0, lng: 0 };
        });
        
        this.updateElementText('sosTime', 'Just now');
        
        // Start countdown
        this.sosCountdown = setInterval(() => {
            this.sosTimer--;
            this.updateSOSTimer();
            
            if (this.sosTimer <= 0) {
                this.notifyEmergencyServices();
            }
        }, 1000);
        
        // Notify emergency contacts
        this.notifyEmergencyContacts();
    }

    updateSOSTimer() {
        const timerElement = document.getElementById('sosTimer');
        if (timerElement) {
            timerElement.textContent = this.sosTimer;
            
            // Change color when time is running out
            if (this.sosTimer <= 10) {
                timerElement.style.color = '#fbbf24';
            }
            if (this.sosTimer <= 5) {
                timerElement.style.color = '#ef4444';
            }
        }
    }

    notifyEmergencyContacts() {
        // In real app, this would send SMS/email to emergency contacts
        console.log('Notifying emergency contacts...');
        this.showToast('Emergency contacts notified', 'info');
    }

    notifyEmergencyServices() {
        if (this.sosLocation) {
            // In real app, this would call emergency services with location
            console.log('Emergency services notified with location:', this.sosLocation);
            this.showToast('Emergency services have been notified!', 'success');
        }
        
        if (this.sosCountdown) {
            clearInterval(this.sosCountdown);
        }
    }

    callEmergency() {
        // Call emergency number
        window.open('tel:112', '_self');
        this.showToast('Calling emergency services...', 'info');
    }

    shareLocation() {
        if (this.sosLocation) {
            const message = `EMERGENCY: I need help! My location: ${this.sosLocation.address}. Coordinates: ${this.sosLocation.lat}, ${this.sosLocation.lng}`;
            
            // Share via Web Share API if available
            if (navigator.share) {
                navigator.share({
                    title: 'EMERGENCY SOS',
                    text: message,
                    url: window.location.href
                }).then(() => {
                    this.showToast('Location shared successfully', 'success');
                }).catch(() => {
                    this.copyToClipboard(message);
                });
            } else {
                this.copyToClipboard(message);
            }
        }
    }

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showToast('Location copied to clipboard. Share it with emergency contacts!', 'success');
        }).catch(() => {
            this.showToast('Could not copy location to clipboard', 'error');
        });
    }

    cancelSOS() {
        if (this.sosCountdown) {
            clearInterval(this.sosCountdown);
        }
        
        this.showToast('SOS cancelled', 'info');
        this.showHome();
    }

    triggerSOS() {
        this.showSOSScreen();
    }

    // Utility functions for map and location
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    const address = await this.reverseGeocode(latitude, longitude);
                    resolve({
                        lat: latitude,
                        lng: longitude,
                        address: address
                    });
                },
                (error) => {
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        });
    }

    async reverseGeocode(lat, lng) {
        // In real app, you would use a geocoding service like Google Maps Geocoding API
        // For demo purposes, return a formatted string with some realistic addresses
        const addresses = [
            '123 Main Street, Downtown',
            '456 Park Avenue, Central District',
            '789 Oak Boulevard, Riverside',
            '321 Pine Street, Uptown',
            '654 Elm Road, Suburbs'
        ];
        
        const randomAddress = addresses[Math.floor(Math.random() * addresses.length)];
        return `${randomAddress} (Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)})`;
    }

    updateMapPosition(lat, lng) {
        // In real app, this would update the map marker and center
        console.log('Updating map position:', lat, lng);
        
        // Simulate moving marker for demo
        const marker = document.querySelector('.current-location-marker');
        if (marker) {
            marker.style.transform = `translate(${Math.random() * 20 - 10}px, ${Math.random() * 20 - 10}px)`;
        }
    }

    handlePositionError(error) {
        let message = 'Unable to get your location: ';
        
        switch(error.code) {
            case error.PERMISSION_DENIED:
                message += 'Location access denied. Please enable location services.';
                break;
            case error.POSITION_UNAVAILABLE:
                message += 'Location information unavailable.';
                break;
            case error.TIMEOUT:
                message += 'Location request timed out.';
                break;
            default:
                message += 'An unknown error occurred.';
                break;
        }
        
        this.showToast(message, 'error');
        this.stopTracking();
    }

    saveTrackedTrip() {
        if (this.trackedPositions.length < 2) {
            this.showToast('Not enough tracking data to save', 'warning');
            return;
        }

        const startPos = this.trackedPositions[0];
        const endPos = this.trackedPositions[this.trackedPositions.length - 1];
        
        const totalDistance = this.trackedPositions.reduce((total, pos, index) => {
            if (index === 0) return 0;
            return total + this.calculateDistance(
                this.trackedPositions[index-1].lat,
                this.trackedPositions[index-1].lng,
                pos.lat,
                pos.lng
            );
        }, 0);

        const trip = {
            id: Date.now(),
            title: 'Tracked Trip',
            startLocation: 'Tracked Start Point',
            endLocation: 'Tracked End Point',
            transport: 'walk', // Default, could be detected based on speed
            distance: parseFloat(totalDistance.toFixed(2)),
            duration: Math.floor((Date.now() - this.trackingStartTime) / 60000),
            co2: this.calculateCO2('walk', totalDistance),
            ecoPoints: this.calculateEcoPoints('walk', totalDistance),
            date: new Date().toISOString(),
            notes: 'Automatically tracked trip',
            timestamp: new Date().getTime(),
            trackedPath: this.trackedPositions
        };

        this.trips.unshift(trip);
        this.saveTrips();
        this.updateUserStats();
        this.showToast('Tracked trip saved successfully!', 'success');
    }

    // ===== UTILITY FUNCTIONS =====
    getTransportIcon(transport) {
        const icons = {
            'walk': 'walking',
            'cycle': 'bicycle',
            'bus': 'bus',
            'train': 'train',
            'car': 'car',
            'flight': 'plane'
        };
        return icons[transport] || 'car';
    }

    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', { 
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return 'Invalid date';
        }
    }

    isSameDay(date1, date2) {
        return date1.getDate() === date2.getDate() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getFullYear() === date2.getFullYear();
    }

    isSameWeek(date1, date2) {
        const oneDay = 24 * 60 * 60 * 1000;
        const diffDays = Math.round(Math.abs((date1 - date2) / oneDay));
        return diffDays <= 7;
    }

    isSameMonth(date1, date2) {
        return date1.getMonth() === date2.getMonth() && 
               date1.getFullYear() === date2.getFullYear();
    }

    updateDateTime() {
        const now = new Date();
        const hours = now.getHours();
        
        let greeting = "Good Evening";
        if (hours < 12) greeting = "Good Morning";
        else if (hours < 18) greeting = "Good Afternoon";
        
        const greetingText = document.getElementById('greetingText');
        const dateDisplay = document.getElementById('dateDisplay');
        
        if (greetingText && this.userData.name) {
            greetingText.textContent = `${greeting}, ${this.userData.name}! 👋`;
        }
        
        if (dateDisplay) {
            dateDisplay.textContent = now.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
    }

    updateElementText(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
        }
    }

    // ===== TOAST NOTIFICATIONS =====
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer') || this.createToastContainer();
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${this.getToastIcon(type)}"></i>
            <span>${message}</span>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 100);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
        return container;
    }

    getToastIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    // ===== LOADING STATES =====
    showLoading(buttonType) {
        const btn = document.querySelector(`.${buttonType}-btn`);
        if (btn) {
            btn.classList.add('btn-loading');
            btn.disabled = true;
        }
    }

    hideLoading(buttonType) {
        const btn = document.querySelector(`.${buttonType}-btn`);
        if (btn) {
            btn.classList.remove('btn-loading');
            btn.disabled = false;
        }
    }

    // ===== DATA PERSISTENCE =====
    saveTrips() {
        localStorage.setItem('trips', JSON.stringify(this.trips));
    }

    saveUserData() {
        localStorage.setItem('userData', JSON.stringify(this.userData));
    }

    saveSettings() {
        localStorage.setItem('settings', JSON.stringify(this.settings));
    }

    loadUserData() {
        const saved = localStorage.getItem('userData');
        if (saved) {
            this.userData = JSON.parse(saved);
        }
    }

    // ===== EXPORT FUNCTIONALITY =====
    exportTrips() {
        if (this.trips.length === 0) {
            this.showToast('No trips to export', 'info');
            return;
        }

        const exportData = {
            app: 'Trip Tracker Pro',
            version: '1.0',
            exportDate: new Date().toISOString(),
            user: this.userData.name,
            totalTrips: this.trips.length,
            trips: this.trips
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        
        const date = new Date().toISOString().split('T')[0];
        link.href = url;
        link.download = `trip-tracker-export-${date}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        this.showToast('Trips exported successfully!', 'success');
    }

    // ===== PUBLIC API =====
    showOnboarding() { this.showScreen('onboardingScreen'); }
    showLogin() { this.showScreen('loginScreen'); }
    showSignup() { this.showScreen('signupScreen'); }
    showApp() { 
        this.showScreen('mainApp'); 
        this.showAppScreen('homeScreen');
        this.updateDashboard();
    }
    showHome() { this.showAppScreen('homeScreen'); }
    showAddTrip() { 
        this.selectedTripId = null;
        this.resetForm();
        this.showAppScreen('addTripScreen'); 
    }
    showHistory() { this.showAppScreen('historyScreen'); }
    showAnalytics() { this.showAppScreen('analyticsScreen'); }
    showProfile() { this.showAppScreen('profileScreen'); }
    showSettings() { this.showToast('Settings feature coming soon!', 'info'); }
    showRewards() { this.showToast('Rewards feature coming soon!', 'info'); }

    // Additional methods
    showTripDetails(tripId) {
        const trip = this.trips.find(t => t.id === tripId);
        if (trip) {
            this.showToast(`Viewing details for: ${trip.title}`, 'info');
            // In a real app, you would navigate to a trip details screen
        }
    }

    showAllBadges() {
        this.showToast('Showing all badges', 'info');
    }

    editProfile() {
        this.showToast('Edit profile feature coming soon!', 'info');
    }

    changeAvatar() {
        this.showToast('Avatar change feature coming soon!', 'info');
    }

    showAbout() {
        this.showToast('Trip Tracker Pro v1.0 • Made with 💚', 'info');
    }

    // Event listeners setup
    setupEventListeners() {
        // Theme toggle
        const themeBtn = document.getElementById('themeBtn');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => this.toggleTheme());
        }

        // Form submissions
        const tripForm = document.getElementById('tripForm');
        if (tripForm) {
            tripForm.addEventListener('submit', (e) => this.saveTrip(e));
        }

        // Settings toggles
        const notificationsSwitch = document.getElementById('notificationsSwitch');
        if (notificationsSwitch) {
            notificationsSwitch.addEventListener('change', () => this.toggleNotifications());
        }

        const locationSwitch = document.getElementById('locationSwitch');
        if (locationSwitch) {
            locationSwitch.addEventListener('change', () => this.toggleLocationTracking());
        }

        const themeSwitch = document.getElementById('themeSwitch');
        if (themeSwitch) {
            themeSwitch.addEventListener('change', () => this.toggleTheme());
        }
    }
}

// ===== APP INITIALIZATION =====
let app;

document.addEventListener('DOMContentLoaded', function() {
    app = new TripTracker();
});

// Make app globally available
window.app = app;

// Handle page visibility changes
document.addEventListener('visibilitychange', function() {
    if (document.hidden && app.isTracking) {
        // Page is hidden, but tracking continues
        console.log('App hidden, tracking continues...');
    }
});

// Handle beforeunload for tracking
window.addEventListener('beforeunload', function(e) {
    if (app.isTracking) {
        e.preventDefault();
        e.returnValue = 'You are currently tracking a trip. Are you sure you want to leave?';
        return e.returnValue;
    }
});