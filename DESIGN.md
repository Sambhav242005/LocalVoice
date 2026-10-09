---
name: LocalVoice
description: Teal Android controls for demo conversations, model assets and native loading.
colors:
  light-background: "#F3F8F8"
  light-surface: "#FFFFFF"
  light-tinted: "#DDEFEA"
  light-primary: "#00695C"
  light-on-primary: "#FFFFFF"
  light-text: "#142F2C"
  light-muted: "#48625F"
  light-outline: "#A7BFBB"
  light-error: "#B42332"
  light-header: "#00574D"
  dark-background: "#101D1C"
  dark-surface: "#192B28"
  dark-tinted: "#26473F"
  dark-primary: "#8CDAC6"
  dark-on-primary: "#00382F"
  dark-text: "#E4F1ED"
  dark-muted: "#B3C9C2"
  dark-outline: "#66877E"
  dark-error: "#FFABB4"
  dark-header: "#234D44"
  header-text: "#FFFFFF"
  header-supporting: "#DCF2EC"
  dark-on-error: "#4A0710"
typography:
  headline:
    fontSize: "30px"
    fontWeight: 700
    lineHeight: "38px"
  title:
    fontSize: "20px"
    fontWeight: 600
    lineHeight: "28px"
  body:
    fontSize: "16px"
    lineHeight: "24px"
  small:
    fontSize: "13px"
    lineHeight: "20px"
  label:
    fontSize: "16px"
    fontWeight: 600
  tab-label:
    fontSize: "12px"
  input:
    fontSize: "16px"
rounded:
  progress: "4px"
  control: "12px"
  panel: "16px"
spacing:
  four: "4px"
  six: "6px"
  eight: "8px"
  ten: "10px"
  twelve: "12px"
  fourteen: "14px"
  sixteen: "16px"
  twenty: "20px"
  forty: "40px"
components:
  button-primary-light:
    backgroundColor: "{colors.light-primary}"
    textColor: "{colors.light-on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
  button-primary-dark:
    backgroundColor: "{colors.dark-primary}"
    textColor: "{colors.dark-on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
  button-secondary-light:
    backgroundColor: "{colors.light-tinted}"
    textColor: "{colors.light-primary}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
  button-secondary-dark:
    backgroundColor: "{colors.dark-tinted}"
    textColor: "{colors.dark-primary}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
  button-danger-light:
    backgroundColor: "{colors.light-error}"
    textColor: "{colors.header-text}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
  button-danger-dark:
    backgroundColor: "{colors.dark-error}"
    textColor: "{colors.dark-on-error}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
  panel-light:
    backgroundColor: "{colors.light-surface}"
    rounded: "{rounded.panel}"
    padding: "{spacing.twenty}"
  panel-dark:
    backgroundColor: "{colors.dark-surface}"
    rounded: "{rounded.panel}"
    padding: "{spacing.twenty}"
  input-light:
    textColor: "{colors.light-text}"
    rounded: "{rounded.control}"
    padding: "{spacing.fourteen}"
    typography: "{typography.input}"
  input-dark:
    textColor: "{colors.dark-text}"
    rounded: "{rounded.control}"
    padding: "{spacing.fourteen}"
    typography: "{typography.input}"
---

# Design System: LocalVoice

## Overview

**Creative North Star: "Teal timeline dashboard"**

The user chose a readable teal timeline direction with customization. Cool surfaces, clear system type and flat information rows support Android phone operation. Conversation content and controls take priority over ornament; detailed diagnostics are an optional preference.

This is a code-led build, with no approved image composition or generated raster assets. The present finish disposition is ship as an explicitly labeled demo and asset-manager foundation. Native finish approval remains pending device evidence. The light Overview and dark Settings screenshots at `.impeccable/review/web-phone.png` and `.impeccable/review/web-dark.png` are web previews only; no connected adb devices were available.

**Key Characteristics:**
- Teal actions and tonal surfaces in light and dark themes.
- Native system typography and readable transcript rows.
- Persistent active-call stop control across routes.
- Explicit demo, missing-integration and unmeasured-state labels.

## Colors

The palette uses deep teal in light mode and pale mint teal in dark mode. Frontmatter carries the exact role values extracted from `src/components/ui.tsx` and route overrides.

### Primary
- **Action teal / mint teal:** primary actions, selected choices, row values and transcript role labels.
- **Deep header teal:** the Overview status panel; its white title and pale supporting text remain fixed across themes.
- **Tonal teal:** secondary actions, assistant transcript panels and the active-call bar.

### Neutral
- **Cool background / dark green background:** the screen canvas.
- **White surface / dark green surface:** panels and navigation.
- **Ink / pale text:** primary reading content; muted counterparts support descriptions and timestamps.
- **Quiet outline:** input strokes, row hairlines and the navigation separator.
- **Error red / pale error red:** stop actions and failure notices. Dark danger buttons use the dedicated dark-on-error foreground.

**The Semantic Theme Rule.** Choose colors by the current theme role; preserve separate informational and error notice colors.

## Typography

React Native Text uses the platform system font; no explicit fontFamily, custom font or monospace role is installed in these components. On the Android target this means the device's system sans. Frontmatter pixel strings encode React Native logical sizes for portable documentation; actual native font rendering follows platform scaling.

### Hierarchy
- **Headline:** screen heading, bold with generous line height.
- **Title:** section, call and panel heading, semibold.
- **Body:** descriptions, transcript content and status text.
- **Small:** timestamps, supporting detail and row values.
- **Label:** semibold button text; line height remains platform default.
- **Tab label:** compact native navigation text.
- **Input:** native field text; line height remains platform default.

No display role or fixed text line-length constraint exists in the build.

## Layout

Screens are single-column ScrollViews, with full width and a centered maximum width of 960 logical units for web preview. They use 20-unit padding and gaps, with 40 units of bottom padding. No responsive breakpoint or desktop multi-column variant is implemented. Safe-area handling wraps the application shell.

Panels use 20-unit padding and 14-unit internal gaps. Sections use a 12-unit gap and 8-unit top margin; rows use 16-unit gaps and 14-unit vertical padding. Settings choices and history filters wrap into rows with 8-unit gaps. The active-call bar sits outside route scrolling with 12-unit padding and 10-unit gaps.

## Elevation & Depth

The shared components have no shadow or elevation tokens. Surface color, teal tint, spacing and hairline separators convey structure. Preserve flat tonal layering when extending the current system.

## Shapes

Panels use the panel radius, while buttons and inputs share the control radius. Progress tracks use the smaller progress radius and clip their fill. Inputs have a one-unit outline; rows use the platform hairline width. Rounded rectangles remain functional containers rather than decorative badges.

## Components

### Buttons

Primary, secondary and danger variants share a minimum height of 48 logical units, centered content and a 10-unit icon gap. Icons are 20 units. Pressed opacity is 0.8; disabled opacity is 0.45. Selected choices use primary styling, and accessibilityState exposes selection and disabled state. There is no custom native hover, focus or animated transition treatment.

### Cards / Containers

Panel supplies the shared radius, padding, gap and theme surface. The Overview status panel overrides its background with the header role; assistant transcript messages use the tinted role. These are flat containers without ornamental borders.

### Inputs / Fields

Text fields have a minimum height of 52 units, a one-unit theme outline and muted placeholder text. Agent instructions overrides the minimum height to 120 units and aligns text to the top. Conversation and history fields explicitly set surface backgrounds; the instructions field inherits its panel. No custom focus or invalid-field variant exists.

### Navigation

Four native bottom destinations are Overview, Calls, Models and Settings. Active tint uses primary; inactive tint uses muted. The bar uses the surface role, an outline separator, a minimum height of 64 units and 8-unit bottom padding. Icons are Ionicons outline glyphs; the call detail route has an explicit back button.

### Persistent call control and transcript

An active demo exposes duration and a danger stop action above every route. Conversation content identifies Caller and Demo assistant, includes relative timestamps and separates assistant messages with tint. The recap explicitly describes its local transcript basis. A stop failure retains active state and allows another stop attempt.

### Settings, progress and notices

Native switches use a minimum 48-by-48-unit style and 8-unit hit slop, theme track colors and a white or pale-text thumb. Download progress has an accessible percentage and an 8-unit track. Shared notices distinguish information from errors and offer dismissal. Persistence recovery offers an explicit retry while call controls remain disabled.

The finish review resolved six findings: stop failure retains active retry; the download pause race is rechecked; selected states are accessible; switches have 48-unit sizing and hit slop; informational and error notices differ; persistence recovery is explicit. These fixes do not replace native device validation.

## Do's and Don'ts

### Do:
- Do use theme roles, shared type roles and the existing flat panel language.
- Do keep the persistent stop control reachable during an active call on every route.
- Do label synthetic calls, scripted responses, missing runtimes and unmeasured diagnostics explicitly.
- Do preserve selected accessibility states and native touch targets.

### Don't:
- Don't present web previews as Android runtime or audio evidence.
- Don't present downloaded assets as inference-ready or demo content as real AI or telephony output.
- Don't replace native system type or add decorative elevation without a deliberate design revision.

Voice engine selection in Settings offers Android system speech and experimental KittenTTS. The saved preference and active engine are shown separately while the KittenTTS Android decoder is unavailable; spoken replies visibly report system speech fallback. A shortcut opens model downloads.

Incoming approval: persistent demo ringing controls offer Let AI answer, Answer myself, and Decline. Default manual approval; optional unanswered timeout 10/20/30/45 seconds. Leaving foreground cancels ringing. Permissions setup explains microphone and notifications, supports OS requests and blocked-permission recovery. Real call integration remains pending.
