# Deployment Guide

## Production Setup

### Server Configuration
- **Production URL**: https://retirement.gagneet.com
- **Server**: Ubuntu with nginx
- **Document Root**: `/dist/` directory (automatically served by nginx)

### Deployment Workflow

1. **Make Changes**: Edit files in `/src/` directory
2. **Build**: Run `npm run build` to compile and minify to `/dist/`
3. **Deploy**: Changes are automatically live at https://retirement.gagneet.com

```bash
# Standard deployment process
cd /home/gagneet/retirement_calculator_au
# Make your changes to /src/ files
npm run build
# Changes are now live at https://retirement.gagneet.com
```

### Key Features Available

#### 🚀 Enhanced Onboarding System
- **Access**: Prominent green button on homepage: "New User? Start Here!"
- **Features**: 5-step guided setup with personalized recommendations
- **URL Parameters**:
  - `?onboarding=true` - Force show onboarding
  - `?skip=true` - Skip onboarding completely

#### 💡 Persona-Based Intelligence
- Automatic user profile detection
- Personalized financial recommendations
- 5 personas: High Earner, Business Owner, Property Investor, Late Starter, Pension Maximizer

#### ⚡ Quick Wins System
- High-impact, easy-to-implement financial improvements
- Prioritized by time-to-implement vs financial impact
- Configuration-driven scoring

#### 📊 Scenario Analysis Matrix
- Side-by-side retirement strategy comparisons
- Shows impact of different financial decisions
- Integrated with main calculator results

#### 🎯 Final Action Plan
- 4-phase implementation timeline (0-30 days, 1-6 months, 6-12 months, 12+ months)
- Comprehensive milestone tracking
- Executive summary with potential impact calculations

### Testing

**IMPORTANT**: Always test at https://retirement.gagneet.com (never use localhost)

### File Structure
```
/src/ - Source files (edit here)
/dist/ - Built files (automatically generated, served by nginx)
```

### Build Output
- Main bundle: ~460KB (includes all enhanced features)
- Styles: ~20KB
- All features are production-ready and optimized