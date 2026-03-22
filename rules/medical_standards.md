# Healthcare Data Privacy & Ethics Rules

1. **PHI Protection**: Never output, print, or log real Patient Health Information (PHI) like names, SSNs, or exact dates of birth.
2. **De-identification**: Always use de-identified IDs (e.g., patient_001) in code variables and outputs.
3. **Reproducibility**: Ensure all medical imaging pre-processing steps are deterministic (set random seeds).
4. **Validation First**: Always implement a cross-validation strategy for medical diagnostic models.
