// calendar_picker_component_engine.js

class CalendarPickerComponentEngine {
    constructor(container, componentId, config = {}) {
        this.container = container;
        this.componentId = componentId;
        this.config = {
            label: config.label || 'Date',
            defaultDate: config.defaultDate || new Date(),
            minDate: config.minDate || null,
            maxDate: config.maxDate || null,
            firstDayOfWeek: config.firstDayOfWeek || 1, // 1 = Monday
            onChange: config.onChange || (() => {}),
            onExpand: config.onExpand || (() => {}),
            expandable: config.expandable !== false,
            monthsToShow: 1, // Start with single month
            ...config
        };
        
        this.currentDate = new Date(this.config.defaultDate);
        this.selectedDate = new Date(this.config.defaultDate);
        this.viewDate = new Date(this.config.defaultDate);
        this.expanded = false;
        
        this.monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'];
        this.dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        
        this.init();
    }
    
    init() {
        this.container.innerHTML = '';
        this.render();
        this.attachEventListeners();
    }
    
    render() {
        const calendarHtml = `
            <div class="calendar-picker-component" id="${this.componentId}">
                <div class="calendar-header">
                    <button class="nav-button prev-month" aria-label="Previous month">
                        <svg width="8" height="12" viewBox="0 0 8 12" fill="none">
                            <path d="M7 1L2 6L7 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        </svg>
                    </button>
                    <div class="month-year-display">
                        ${this.monthNames[this.viewDate.getMonth()]} ${this.viewDate.getFullYear()}
                    </div>
                    <button class="nav-button next-month" aria-label="Next month">
                        <svg width="8" height="12" viewBox="0 0 8 12" fill="none">
                            <path d="M1 1L6 6L1 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        </svg>
                    </button>
                    ${this.config.expandable ? `
                        <button class="expand-button" aria-label="Toggle calendar expansion">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                            </svg>
                        </button>
                    ` : ''}
                </div>
                <div class="calendar-container">
                    ${this.renderMonths()}
                </div>
            </div>
        `;
        
        this.container.innerHTML = calendarHtml;
        this.addStyles();
    }
    
    renderMonths() {
        const monthsToRender = this.expanded ? 3 : 1;
        let monthsHtml = '';
        
        for (let i = 0; i < monthsToRender; i++) {
            const monthDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() + i, 1);
            monthsHtml += this.renderMonth(monthDate);
        }
        
        return monthsHtml;
    }
    
    renderMonth(monthDate) {
        const year = monthDate.getFullYear();
        const month = monthDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        
        // Calculate starting day (0 = Sunday, adjust for Monday start)
        let startingDayOfWeek = firstDay.getDay() - this.config.firstDayOfWeek;
        if (startingDayOfWeek < 0) startingDayOfWeek += 7;
        
        // Get previous month's trailing days
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        const prevMonthDays = startingDayOfWeek;
        
        let monthHtml = `
            <div class="calendar-month" data-month="${month}" data-year="${year}">
                ${this.expanded ? `<div class="month-label">${this.monthNames[month]} ${year}</div>` : ''}
                <div class="calendar-grid">
                    <div class="weekday-headers">
                        ${this.dayNames.map(day => `<div class="weekday">${day}</div>`).join('')}
                    </div>
                    <div class="days-grid">
        `;
        
        // Previous month's trailing days
        for (let i = prevMonthDays; i > 0; i--) {
            const day = prevMonthLastDay - i + 1;
            const date = new Date(year, month - 1, day);
            monthHtml += this.renderDay(date, 'other-month');
        }
        
        // Current month's days
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            monthHtml += this.renderDay(date, 'current-month');
        }
        
        // Next month's leading days
        const totalCells = prevMonthDays + daysInMonth;
        const nextMonthDays = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
        for (let day = 1; day <= nextMonthDays; day++) {
            const date = new Date(year, month + 1, day);
            monthHtml += this.renderDay(date, 'other-month');
        }
        
        monthHtml += `
                    </div>
                </div>
            </div>
        `;
        
        return monthHtml;
    }
    
    renderDay(date, monthClass) {
        const isSelected = this.isSameDay(date, this.selectedDate);
        const isToday = this.isSameDay(date, new Date());
        const isDisabled = this.isDateDisabled(date);
        
        const classes = [
            'calendar-day',
            monthClass,
            isSelected ? 'selected' : '',
            isToday ? 'today' : '',
            isDisabled ? 'disabled' : ''
        ].filter(Boolean).join(' ');
        
        return `
            <button class="${classes}" 
                    data-date="${date.toISOString()}"
                    ${isDisabled ? 'disabled' : ''}
                    aria-label="${date.toLocaleDateString()}">
                ${date.getDate()}
            </button>
        `;
    }
    
    isSameDay(date1, date2) {
        return date1.getDate() === date2.getDate() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getFullYear() === date2.getFullYear();
    }
    
    isDateDisabled(date) {
        if (this.config.minDate && date < this.config.minDate) return true;
        if (this.config.maxDate && date > this.config.maxDate) return true;
        return false;
    }
    
    attachEventListeners() {
        const component = this.container.querySelector('.calendar-picker-component');
        
        // Navigation buttons
        const prevButton = component.querySelector('.prev-month');
        const nextButton = component.querySelector('.next-month');
        
        prevButton?.addEventListener('click', () => this.navigateMonth(-1));
        nextButton?.addEventListener('click', () => this.navigateMonth(1));
        
        // Expand button
        const expandButton = component.querySelector('.expand-button');
        expandButton?.addEventListener('click', () => this.toggleExpanded());
        
        // Day selection
        component.addEventListener('click', (e) => {
            const dayButton = e.target.closest('.calendar-day:not(.disabled)');
            if (dayButton) {
                const date = new Date(dayButton.dataset.date);
                this.selectDate(date);
            }
        });
        
        // Touch support for navigation
        let touchStartX = 0;
        component.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
        });
        
        component.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].clientX;
            const diff = touchStartX - touchEndX;
            
            if (Math.abs(diff) > 50) {
                if (diff > 0) {
                    this.navigateMonth(1);
                } else {
                    this.navigateMonth(-1);
                }
            }
        });
    }
    
    navigateMonth(direction) {
        this.viewDate.setMonth(this.viewDate.getMonth() + direction);
        this.render();
        this.attachEventListeners();
    }
    
    toggleExpanded() {
        this.expanded = !this.expanded;
        this.config.onExpand(this.expanded);
        this.render();
        this.attachEventListeners();
        
        // Animate expansion
        const container = this.container.querySelector('.calendar-container');
        container.style.height = 'auto';
        const height = container.offsetHeight;
        container.style.height = '0';
        container.offsetHeight; // Force reflow
        container.style.transition = 'height 0.3s ease';
        container.style.height = height + 'px';
        
        setTimeout(() => {
            container.style.height = 'auto';
            container.style.transition = '';
        }, 300);
    }
    
    selectDate(date) {
        this.selectedDate = date;
        this.currentDate = date;
        
        // Update visual selection
        const allDays = this.container.querySelectorAll('.calendar-day');
        allDays.forEach(day => day.classList.remove('selected'));
        
        const selectedDay = this.container.querySelector(`[data-date="${date.toISOString()}"]`);
        selectedDay?.classList.add('selected');
        
        this.config.onChange(date);
    }
    
    getValue() {
        return this.selectedDate;
    }
    
    setValue(date) {
        this.selectedDate = new Date(date);
        this.currentDate = new Date(date);
        this.viewDate = new Date(date);
        this.render();
        this.attachEventListeners();
    }
    
    addStyles() {
        if (document.getElementById('calendar-picker-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'calendar-picker-styles';
        styles.textContent = `
            .calendar-picker-component {
                background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
                border-radius: 24px;
                padding: 16px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08);
                border: 1px solid rgba(255, 255, 255, 0.1);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                user-select: none;
                color: #ffffff;
                min-width: 320px;
            }
            
            .calendar-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 16px;
                padding: 0 8px;
            }
            
            .nav-button, .expand-button {
                background: rgba(255, 255, 255, 0.1);
                border: none;
                border-radius: 8px;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s ease;
                color: #ffffff;
            }
            
            .nav-button:hover, .expand-button:hover {
                background: rgba(255, 255, 255, 0.2);
                transform: scale(1.05);
            }
            
            .month-year-display {
                font-size: 18px;
                font-weight: 600;
                color: #ffffff;
                text-align: center;
                flex: 1;
            }
            
            .calendar-container {
                overflow: hidden;
            }
            
            .calendar-month {
                margin-bottom: 24px;
            }
            
            .calendar-month:last-child {
                margin-bottom: 0;
            }
            
            .month-label {
                text-align: center;
                font-size: 16px;
                font-weight: 500;
                margin-bottom: 12px;
                color: rgba(255, 255, 255, 0.8);
            }
            
            .calendar-grid {
                background: rgba(0, 0, 0, 0.2);
                border-radius: 16px;
                padding: 12px;
            }
            
            .weekday-headers {
                display: grid;
                grid-template-columns: repeat(7, 1fr);
                gap: 4px;
                margin-bottom: 8px;
            }
            
            .weekday {
                text-align: center;
                font-size: 12px;
                font-weight: 600;
                color: rgba(255, 255, 255, 0.6);
                padding: 4px;
            }
            
            .days-grid {
                display: grid;
                grid-template-columns: repeat(7, 1fr);
                gap: 4px;
            }
            
            .calendar-day {
                aspect-ratio: 1;
                border: none;
                border-radius: 8px;
                background: transparent;
                color: #ffffff;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
            }
            
            .calendar-day:hover:not(.disabled) {
                background: rgba(255, 255, 255, 0.1);
                transform: scale(1.05);
            }
            
            .calendar-day.other-month {
                color: rgba(255, 255, 255, 0.3);
            }
            
            .calendar-day.today {
                background: rgba(59, 130, 246, 0.2);
                color: #60a5fa;
                font-weight: 600;
            }
            
            .calendar-day.selected {
                background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                color: #ffffff;
                font-weight: 600;
                box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
            }
            
            .calendar-day.disabled {
                color: rgba(255, 255, 255, 0.2);
                cursor: not-allowed;
            }
            
            .calendar-day.disabled:hover {
                background: transparent;
                transform: none;
            }
            
            /* Expanded state animation */
            .calendar-picker-component.expanded .expand-button svg {
                transform: rotate(180deg);
            }
            
            .expand-button svg {
                transition: transform 0.3s ease;
            }
            
            /* Responsive adjustments */
            @media (max-width: 480px) {
                .calendar-picker-component {
                    min-width: 280px;
                    padding: 12px;
                }
                
                .calendar-day {
                    font-size: 13px;
                }
                
                .month-year-display {
                    font-size: 16px;
                }
            }
        `;
        
        document.head.appendChild(styles);
    }
}

// Export with snake_case name for consistency
export { CalendarPickerComponentEngine as calendar_picker_component_engine };
