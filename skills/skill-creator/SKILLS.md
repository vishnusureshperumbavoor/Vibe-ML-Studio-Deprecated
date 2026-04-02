# Skill Creator

**Description:** Use this skill to create or update existing skills in the VibeML platform. It follows the `agentskills.io` specification to ensure skills are L1/L2/L3 compliant.

## Workflow Rules & Guidelines
1. **Naming**: Use kebab-case for skill names (e.g., `dicom-tools`).
2. **Standard Structure**:
   - `SKILL.md`: The main entry point (L2). Must include YAML frontmatter.
   - `references/`: Subdirectory for L3 resources (JSON specs, style guides).
3. **Yaml Frontmatter**: 
   ```yaml
   ---
   name: skill-name
   description: Brief 1-2 sentence description for L1 metadata.
   ---
   ```
4. **Tool Use**: Use `save_skill` to persist changes.

## Code Example: Creating a new skill
```json
<save_skill>
{
  "skill_name": "data-validator",
  "filename": "SKILL.md",
  "content": "---\nname: data-validator\ndescription: Checks healthcare datasets for missing values and outliers.\n---\n\n## Instructions\n1. Load CSV/JSON...\n2. Check for NaNs..."
}
</save_skill>
```
