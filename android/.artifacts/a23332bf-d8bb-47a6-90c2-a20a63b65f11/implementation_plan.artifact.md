# Implementation Plan - Danta V2 Ultimate AI & Reporting

This plan focuses on building the **high-fidelity clinical output** and **deep Groq AI integration** seen in the V2 web application. We will move the app from simple data capture to generating the rich, prose-based clinical reports that are the "Real Danta" value proposition.

## Core Feature Upgrades

### 1. High-Fidelity Groq AI Integration
- **Prose Generation**: I will update the Groq API prompt to return the specific sections seen in the screenshots:
    - **Visual Landmark (Unique to Photo)**: AI observation of specular highlights, vascularity, etc.
    - **Clinical Findings**: Narrative description of the extraction socket's status.
- **AI Feature Matrix**: Capturing explicit status for Blood Clot, Bone Exposure, Inflammation, and Debris.
- **Security**: Move the Groq API Key to `local.properties` (the Android equivalent of `.env`) to keep it safe while making it accessible to the build system.

### 2. The "Real" V2 Report Screen
- **Risk Speedometer**: A custom UI component that renders a semi-circular gauge with a needle and color zones (Green → Yellow → Red).
- **Weighted Score Breakdown**: A dedicated card showing the **Clinical BN (60%)** and **Image AI (40%)** contribution.
- **Prose Cards**: Polished cards displaying the "Visual Landmark" and "Clinical Findings" narrative.
- **Clinical Protocol**: An grouped list of Urgent, High, and Moderate recommendations.

### 3. Patient History & Logging
- **Dashboard Connect**: Update the Dashboard to fetch and display the actual patient name and formatted date in the activity list.
- **Full Report View**: Allow clicking a dashboard item to view the full high-fidelity report again.

---

## Proposed Changes

### AI & Models
#### [MODIFY] [Models.kt](file:///C:/Users/Pooji/StudioProjects/Danta/android/app/src/main/java/com/danta/app/logic/Models.kt)
Update `AssessmentRecord` and `ImageAnalysisResult` to store narrative prose and confidence intervals.

#### [MODIFY] [VisionAIService.kt](file:///C:/Users/Pooji/StudioProjects/Danta/android/app/src/main/java/com/danta/app/services/VisionAIService.kt)
Upgrade the Groq prompt to request structured JSON containing Visual Landmarks, Clinical Findings, and the Feature Matrix.

### User Interface
#### [MODIFY] [activity_result.xml](file:///C:/Users/Pooji/StudioProjects/Danta/android/app/src/main/res/layout/activity_result.xml)
Rebuild the layout to include the Speedometer Gauge, Weighted Fusion cards, and Prose Narrative sections.

#### [MODIFY] [ResultActivity.kt](file:///C:/Users/Pooji/StudioProjects/Danta/android/app/src/main/java/com/danta/app/ResultActivity.kt)
Implement the rendering logic for the new high-fidelity reports.

## Verification Plan
- **AI Prose Validation**: Verify that the Groq response correctly fills the "Visual Landmarks" and "Clinical Findings" fields.
- **UI Visual Audit**: Compare the new Speedometer Gauge and Cards against the 10:50 PM screenshots.
- **End-to-End**: Create patient -> Run full 4-step wizard -> See "84% High Risk" report -> Save to Record -> See in Dashboard.
