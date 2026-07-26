# Task: Danta V2 Upgrade - Phase 1 & 2

- [x] **Data Layer Preparation** <!-- id: 0 -->
    - [x] Add `@Serializable` to all models in `RiskCalculator.kt` and `BayesianNetwork.kt`
    - [x] Create `Patient` and `Assessment` data classes for DB storage
- [x] **Repository Implementation** <!-- id: 1 -->
    - [x] Create `ClinicalRepository.kt` to handle Supabase interactions
- [x] **Dashboard Overhaul** <!-- id: 2 -->
    - [x] Update `activity_dashboard.xml` with proper stats and RecyclerView
    - [x] Create `AssessmentAdapter` for the recent list
    - [x] Connect `DashboardActivity.kt` to the repository
- [x] **Detailed Results & Recommendations** <!-- id: 3 -->
    - [x] Create `activity_result.xml` (The "Real" CDS Output)
    - [x] Create `ResultActivity.kt` to display factors and recommendations
- [x] **Integration & Persistence** <!-- id: 4 -->
    - [x] Update `AssessmentActivity.kt` to save results before showing the report
- [x] **Verification** <!-- id: 5 -->
    - [x] Perform Gradle Sync and Assemble build
