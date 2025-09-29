# HOW-TO Page Navigation Setup

## Overview
The HOW-TO page (`src/how-to-use.html`) is now fully integrated with the main Australian Retirement Calculator with bidirectional navigation links.

## Navigation Links Added

### 1. Main Calculator to HOW-TO Page

**Location**: `src/index.html` header section

#### Navigation Menu (Top Left)
- **Menu Button**: Hamburger-style dropdown menu in the top-left corner
- **"How to Use Guide"** link with book icon
- **Additional Links**:
  - Feedback & Contact
  - Terms & Privacy

#### Quick Start Section
- **"Help Guide"** button in the Quick Start instructions box
- Provides immediate access to help when users need guidance

### 2. HOW-TO Page to Main Calculator

**Location**: `src/how-to-use.html`

#### Header Section
- **"Open Calculator"** button prominently displayed in hero section
- **Direct navigation** back to the main tool

#### Footer Section
- **"Open Calculator"** button in footer for easy access after reading guide
- **"Contact Support"** for additional help

## Implementation Details

### JavaScript Functionality
```javascript
// Navigation dropdown menu functionality in index.html
document.addEventListener('DOMContentLoaded', function() {
    const navMenuButton = document.getElementById('navMenuButton');
    const navDropdown = document.getElementById('navDropdown');

    // Toggle dropdown, close on outside click, keyboard navigation
});
```

### CSS Styling
- **Responsive design** that works on desktop and mobile
- **Hover effects** and smooth transitions
- **Accessibility features** with proper ARIA labels
- **Professional appearance** matching calculator design

### File Structure
```
src/
├── index.html              # Main calculator with navigation menu
├── how-to-use.html         # Complete interactive guide
├── js/
│   ├── howto-interactive.js # Interactive features for guide
│   └── animated-demo.js     # Animated video demonstration
└── assets/
    └── workflow-diagrams.svg # Visual workflow diagram
```

## Features Available via Navigation

### From Main Calculator:
1. **Complete HOW-TO Guide** - Step-by-step instructions
2. **Interactive Demos** - Live examples and simulations
3. **Animated Walkthrough** - Video-style demonstration
4. **Feature Explanations** - Detailed coverage of all tools
5. **Troubleshooting Help** - Common issues and solutions

### Return Navigation:
- **Quick access** back to calculator from any point in guide
- **Seamless transition** between learning and doing
- **Preserved form data** (auto-save functionality maintained)

## User Experience Flow

### New User Journey:
1. **Arrives at main calculator** (`index.html`)
2. **Clicks "Help Guide"** in Quick Start section or Menu
3. **Learns how to use** all features via interactive guide
4. **Returns to calculator** with confidence via "Open Calculator" button
5. **Applies knowledge** to create their retirement plan

### Returning User Journey:
1. **Quick access to calculator** via prominent navigation
2. **Reference specific features** in guide as needed
3. **Use advanced tips** for optimization strategies

## Technical Implementation

### Responsive Navigation
- **Mobile-friendly** hamburger menu on small screens
- **Desktop dropdown** with hover effects
- **Keyboard accessible** with proper focus management

### Cross-Page Integration
- **Consistent branding** and styling across pages
- **Logical information architecture**
- **Clear entry and exit points**
- **Progressive disclosure** of information

## Benefits

### For Users:
- **Reduced learning curve** - easy access to help
- **Self-service support** - comprehensive guidance available
- **Confidence building** - thorough understanding before using
- **Feature discovery** - learn about advanced capabilities

### For Site Owner:
- **Reduced support requests** - comprehensive self-help resource
- **Increased engagement** - users more likely to explore features
- **Professional impression** - polished, complete user experience
- **Better retention** - users who understand the tool are more likely to return

## Maintenance Notes

### When Adding New Features:
1. **Update HOW-TO guide** with new feature explanations
2. **Add interactive demos** for complex features
3. **Update workflow diagrams** if process changes
4. **Test all navigation links** remain functional

### Performance Considerations:
- **Minimal JavaScript** for navigation - fast loading
- **CSS-based styling** - smooth animations without JavaScript frameworks
- **Optimized assets** - compressed images and efficient code

The navigation system creates a seamless, professional user experience that guides users from confusion to confidence in using the Australian Retirement Calculator.