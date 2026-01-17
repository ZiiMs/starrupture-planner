# Fabricator Recipe Rate Correction

## Context

### Original Request

User reported that building counts are showing "0.1x" for excavator, fabricator, and furnace. Investigation revealed recipe data has amounts 30x higher than specified, causing overproduction.

### Interview Summary

**Key Discussions**:

- User provided exact per-minute rates for 13 fabricator recipes
- Values are "predetermined" and cannot be adjusted
- Goal: Fix recipe amounts so 1 building = target rate, not 30x overproduction

**Research Findings**:

- Formula: `rate = (60 × output_amount) / time`
- Current data uses amounts 15, 30, 60, 120, 240 which produce 450-7200/min
- User specs: 10-375/min which requires amounts 1-25
- Current Stator uses time=60 with amounts 40/20/20 → correct rate, but wrong amounts
- Pistol Ammo: 210→375/min requires time=4, input=14, output=25 (integers)

### Metis Review

**Identified Gaps** (addressed):

- Guardrails confirmed: Only modify fabricator recipes, preserve structure
- Pistol Ammo requires time=4 (not 1) for integer amounts
- All 13 recipes need updates, no actual discrepancies found in requirements

---

## Work Objectives

### Core Objective

Update all 13 fabricator recipes in `recipes.json` to produce user-specified rates per minute.

### Concrete Deliverables

- File: `src/data/recipes.json` (13 recipe updates)

### Definition of Done

- [ ] All 13 fabricator recipes updated with correct amounts and times
- [ ] Rate verification: `(60 × output_amount) / time` = specified rate
- [ ] Input verification: `(60 × input_amount) / time` = specified input rate
- [ ] No changes to non-fabricator recipes

### Must Have

- 13 fabricator recipes updated
- All rates match user specifications exactly
- Integer amounts for all inputs/outputs

### Must NOT Have (Guardrails)

- No changes to non-fabricator recipes (smelter, furnace, excavator, etc.)
- No recipe deletions
- No recipe additions
- No changes to `id`, `name`, `producers`, `category` fields
- No changes to `outputRate` field

---

## Recipe Values

### User-Specified Rates (Per Minute)

| Recipe                  | Input Rate                           | Output Rate                 |
| ----------------------- | ------------------------------------ | --------------------------- |
| Wolfram Wire            | Wolfram bar 15                       | Wolfram Wire 30             |
| Wolfram Plate           | Wolfram bar 60                       | Wolfram Plate 60            |
| Titanium Beam           | Titanium Bar 20                      | Titanium Beam 20            |
| Titanium Rod            | Titanium Bar 30                      | Titanium Rod 30             |
| Titanium Sheet          | Titanium Bar 30                      | Titanium Sheet 60           |
| Tube                    | Titanium Rod 30, Titanium Sheet 30   | Tube 60                     |
| Rotor                   | Titanium Rod 20, Wolfram Wire 20     | Rotor 10                    |
| Calcite Sheets          | Calcium Blocks 30                    | Calcite Sheets 60           |
| Basic Building Material | Wolfram Ore 30, Titanium Ore 30      | Basic Building Material 300 |
| Stabilizer              | Rotor 10, Titanium Rod 20            | Stabilizer 10               |
| Pistol Ammo             | Basic Building Material 210          | Pistol Ammo 375             |
| Applicator              | Tube 120, Glass 30                   | Applicator 15               |
| Stator                  | Titanium Housing 40, Wolfram Wire 20 | Stator 20                   |

### Calculated Recipe Values

Formula: `time = (60 × output_amount) / desired_rate`

| Recipe                  | Time (sec) | Input Amount                       | Output Amount              |
| ----------------------- | ---------- | ---------------------------------- | -------------------------- |
| Wolfram Wire            | 4          | 1 wolfram-bar                      | 2 wolfram-wire             |
| Wolfram Plate           | 1          | 1 wolfram-bar                      | 1 wolfram-plate            |
| Titanium Beam           | 3          | 1 titanium-bar                     | 1 titanium-beam            |
| Titanium Rod            | 2          | 1 titanium-bar                     | 1 titanium-rod             |
| Titanium Sheet          | 1          | 1 titanium-bar                     | 2 titanium-sheet           |
| Tube                    | 2          | 1 titanium-rod, 1 titanium-sheet   | 2 tube                     |
| Rotor                   | 6          | 1 titanium-rod, 1 wolfram-wire     | 1 rotor                    |
| Calcite Sheets          | 2          | 1 calcium-block                    | 2 calcite-sheet            |
| Basic Building Material | 1          | 1 wolfram-ore, 1 titanium-ore      | 5 basic-building-materials |
| Stabilizer              | 6          | 1 rotor, 2 titanium-rod            | 1 stabilizer               |
| Pistol Ammo             | 4          | 14 basic-building-materials        | 25 pistol-ammo             |
| Applicator              | 4          | 8 tube, 2 glass                    | 1 applicator               |
| Stator                  | 3          | 2 titanium-housing, 1 wolfram-wire | 1 stator                   |

### Rate Verification

| Recipe                  | Formula       | Result    |
| ----------------------- | ------------- | --------- |
| Wolfram Wire            | (60 × 2) / 4  | 30/min ✓  |
| Wolfram Plate           | (60 × 1) / 1  | 60/min ✓  |
| Titanium Beam           | (60 × 1) / 3  | 20/min ✓  |
| Titanium Rod            | (60 × 1) / 2  | 30/min ✓  |
| Titanium Sheet          | (60 × 2) / 1  | 60/min ✓  |
| Tube                    | (60 × 2) / 2  | 60/min ✓  |
| Rotor                   | (60 × 1) / 6  | 10/min ✓  |
| Calcite Sheets          | (60 × 2) / 2  | 60/min ✓  |
| Basic Building Material | (60 × 5) / 1  | 300/min ✓ |
| Stabilizer              | (60 × 1) / 6  | 10/min ✓  |
| Pistol Ammo             | (60 × 25) / 4 | 375/min ✓ |
| Applicator              | (60 × 1) / 4  | 15/min ✓  |
| Stator                  | (60 × 1) / 3  | 20/min ✓  |

---

## Verification Strategy

**Test Infrastructure**: Not applicable (data-only changes)

**Manual Verification**:

- Read `src/data/recipes.json`
- Calculate expected rate for each recipe using formula
- Verify all 13 recipes match specifications

---

## Task Flow

```
Recipe 1 → Recipe 2 → Recipe 3 → ... → Recipe 13 → Verify All
```

## Parallelization

All recipe updates are independent - can be done in any order.

---

## TODOs

> Each TODO is one recipe update with verification.

- [ ] 1. Update craft-wolfram-wire recipe

  **What to do**:
  - Update time from 2 to 4
  - Update input amount from 15 to 1
  - Update output amount from 30 to 2

  **Must NOT do**:
  - Change id, name, producers, category, outputRate

  **Parallelizable**: YES (with all other recipes)

  **References**:

  **Current Recipe Location**: `src/data/recipes.json:491-509`

  **Pattern**: Follow existing recipe structure - keep all fields except time, inputs[].amount, outputs[].amount

  **Acceptance Criteria**:
  - [ ] Recipe time = 4
  - [ ] Input amount = 1 wolfram-bar
  - [ ] Output amount = 2 wolfram-wire
  - [ ] Rate verification: (60 × 2) / 4 = 30/min

- [ ] 2. Update craft-wolfram-plate recipe

  **What to do**:
  - Update time from 2 to 1
  - Update input amount from 60 to 1
  - Update output amount from 60 to 1

  **Must NOT do**:
  - Change id, name, producers, category, outputRate

  **Parallelizable**: YES (with all other recipes)

  **References**:

  **Current Recipe Location**: `src/data/recipes.json:511-529`

  **Acceptance Criteria**:
  - [ ] Recipe time = 1
  - [ ] Input amount = 1 wolfram-bar
  - [ ] Output amount = 1 wolfram-plate
  - [ ] Rate verification: (60 × 1) / 1 = 60/min

- [ ] 3. Update craft-titanium-beam recipe

  **What to do**:
  - Update time from 2 to 3
  - Update input amount from 20 to 1
  - Update output amount from 20 to 1

  **Must NOT do**:
  - Change id, name, producers, category, outputRate

  **Parallelizable**: YES (with all other recipes)

  **References**:

  **Current Recipe Location**: `src/data/recipes.json:531-549`

  **Acceptance Criteria**:
  - [ ] Recipe time = 3
  - [ ] Input amount = 1 titanium-bar
  - [ ] Output amount = 1 titanium-beam
  - [ ] Rate verification: (60 × 1) / 3 = 20/min

- [ ] 4. Update craft-titanium-rod recipe

  **What to do**:
  - Update time from 2 to 2
  - Update input amount from 30 to 1
  - Update output amount from 30 to 1

  **Must NOT do**:
  - Change id, name, producers, category, outputRate

  **Parallelizable**: YES (with all other recipes)

  **References**:

  **Current Recipe Location**: `src/data/recipes.json:551-569`

  **Acceptance Criteria**:
  - [ ] Recipe time = 2
  - [ ] Input amount = 1 titanium-bar
  - [ ] Output amount = 1 titanium-rod
  - [ ] Rate verification: (60 × 1) / 2 = 30/min

- [ ] 5. Update craft-titanium-sheet recipe

  **What to do**:
  - Update time from 2 to 1
  - Update input amount from 30 to 1
  - Update output amount from 60 to 2

  **Must NOT do**:
  - Change id, name, producers, category, outputRate

  **Parallelizable**: YES (with all other recipes)

  **References**:

  **Current Recipe Location**: `src/data/recipes.json:571-589`

  **Acceptance Criteria**:
  - [ ] Recipe time = 1
  - [ ] Input amount = 1 titanium-bar
  - [ ] Output amount = 2 titanium-sheet
  - [ ] Rate verification: (60 × 2) / 1 = 60/min

- [ ] 6. Update craft-tube recipe

  **What to do**:
  - Update time from 2 to 2
  - Update first input amount from 30 to 1
  - Update second input amount from 30 to 1
  - Update output amount from 60 to 2

  **Must NOT do**:
  - Change id, name, producers, category, outputRate

  **Parallelizable**: YES (with all other recipes)

  **References**:

  **Current Recipe Location**: `src/data/recipes.json:591-613`

  **Acceptance Criteria**:
  - [ ] Recipe time = 2
  - [ ] First input amount = 1 titanium-rod
  - [ ] Second input amount = 1 titanium-sheet
  - [ ] Output amount = 2 tube
  - [ ] Rate verification: (60 × 2) / 2 = 60/min

- [ ] 7. Update craft-rotor recipe

  **What to do**:
  - Update time from 2 to 6
  - Update first input amount from 20 to 1
  - Update second input amount from 20 to 1
  - Update output amount from 10 to 1

  **Must NOT do**:
  - Change id, name, producers, category, outputRate

  **Parallelizable**: YES (with all other recipes)

  **References**:

  **Current Recipe Location**: `src/data/recipes.json:615-637`

  **Acceptance Criteria**:
  - [ ] Recipe time = 6
  - [ ] First input amount = 1 titanium-rod
  - [ ] Second input amount = 1 wolfram-wire
  - [ ] Output amount = 1 rotor
  - [ ] Rate verification: (60 × 1) / 6 = 10/min

- [ ] 8. Update craft-calcite-sheets recipe

  **What to do**:
  - Update time from 2 to 2
  - Update input amount from 30 to 1
  - Update output amount from 60 to 2

  **Must NOT do**:
  - Change id, name, producers, category, outputRate

  **Parallelizable**: YES (with all other recipes)

  **References**:

  **Current Recipe Location**: `src/data/recipes.json:639-657`

  **Acceptance Criteria**:
  - [ ] Recipe time = 2
  - [ ] Input amount = 1 calcium-block
  - [ ] Output amount = 2 calcite-sheet
  - [ ] Rate verification: (60 × 2) / 2 = 60/min

- [ ] 9. Update craft-basic-building-materials recipe

  **What to do**:
  - Update time from 2 to 1
  - Update first input amount from 30 to 1
  - Update second input amount from 30 to 1
  - Update output amount from 300 to 5

  **Must NOT do**:
  - Change id, name, producers, category, outputRate

  **Parallelizable**: YES (with all other recipes)

  **References**:

  **Current Recipe Location**: `src/data/recipes.json:659-681`

  **Acceptance Criteria**:
  - [ ] Recipe time = 1
  - [ ] First input amount = 1 wolfram-ore
  - [ ] Second input amount = 1 titanium-ore
  - [ ] Output amount = 5 basic-building-materials
  - [ ] Rate verification: (60 × 5) / 1 = 300/min

- [ ] 10. Update craft-stabilizer recipe

  **What to do**:
  - Update time from 2 to 6
  - Update first input amount from 10 to 1
  - Update second input amount from 20 to 2
  - Update output amount from 10 to 1

  **Must NOT do**:
  - Change id, name, producers, category, outputRate

  **Parallelizable**: YES (with all other recipes)

  **References**:

  **Current Recipe Location**: `src/data/recipes.json:683-705`

  **Acceptance Criteria**:
  - [ ] Recipe time = 6
  - [ ] First input amount = 1 rotor
  - [ ] Second input amount = 2 titanium-rod
  - [ ] Output amount = 1 stabilizer
  - [ ] Rate verification: (60 × 1) / 6 = 10/min

- [ ] 11. Update craft-pistol-ammo recipe

  **What to do**:
  - Update time from 2 to 4
  - Update input amount from 210 to 14
  - Update output amount from 375 to 25

  **Must NOT do**:
  - Change id, name, producers, category, outputRate

  **Parallelizable**: YES (with all other recipes)

  **References**:

  **Current Recipe Location**: `src/data/recipes.json:707-725`

  **Acceptance Criteria**:
  - [ ] Recipe time = 4
  - [ ] Input amount = 14 basic-building-materials
  - [ ] Output amount = 25 pistol-ammo
  - [ ] Rate verification: (60 × 25) / 4 = 375/min

- [ ] 12. Update craft-applicator recipe

  **What to do**:
  - Update time from 2 to 4
  - Update first input amount from 120 to 8
  - Update second input amount from 30 to 2
  - Update output amount from 15 to 1

  **Must NOT do**:
  - Change id, name, producers, category, outputRate

  **Parallelizable**: YES (with all other recipes)

  **References**:

  **Current Recipe Location**: `src/data/recipes.json:727-749`

  **Acceptance Criteria**:
  - [ ] Recipe time = 4
  - [ ] First input amount = 8 tube
  - [ ] Second input amount = 2 glass
  - [ ] Output amount = 1 applicator
  - [ ] Rate verification: (60 × 1) / 4 = 15/min

- [ ] 13. Update craft-stator recipe

  **What to do**:
  - Update time from 60 to 3
  - Update first input amount from 40 to 2
  - Update second input amount from 20 to 1
  - Update output amount from 20 to 1

  **Must NOT do**:
  - Change id, name, producers, category, outputRate

  **Parallelizable**: YES (with all other recipes)

  **References**:

  **Current Recipe Location**: `src/data/recipes.json:751-773`

  **Acceptance Criteria**:
  - [ ] Recipe time = 3
  - [ ] First input amount = 2 titanium-housing
  - [ ] Second input amount = 1 wolfram-wire
  - [ ] Output amount = 1 stator
  - [ ] Rate verification: (60 × 1) / 3 = 20/min

- [ ] 14. Final verification - all 13 recipes

  **What to do**:
  - Read `src/data/recipes.json`
  - For each recipe, calculate: `(60 × output_amount) / time`
  - Verify result matches user-specified output rate
  - Calculate input rates similarly: `(60 × input_amount) / time`
  - Verify result matches user-specified input rate

  **Parallelizable**: NO (must run after all recipes updated)

  **References**:

  **Target File**: `src/data/recipes.json`

  **Acceptance Criteria**:
  - [ ] craft-wolfram-wire: input 15/min, output 30/min
  - [ ] craft-wolfram-plate: input 60/min, output 60/min
  - [ ] craft-titanium-beam: input 20/min, output 20/min
  - [ ] craft-titanium-rod: input 30/min, output 30/min
  - [ ] craft-titanium-sheet: input 30/min, output 60/min
  - [ ] craft-tube: input 30+30/min, output 60/min
  - [ ] craft-rotor: input 20+20/min, output 10/min
  - [ ] craft-calcite-sheets: input 30/min, output 60/min
  - [ ] craft-basic-building-materials: input 30+30/min, output 300/min
  - [ ] craft-stabilizer: input 10+20/min, output 10/min
  - [ ] craft-pistol-ammo: input 210/min, output 375/min
  - [ ] craft-applicator: input 120+30/min, output 15/min
  - [ ] craft-stator: input 40+20/min, output 20/min

---

## Commit Strategy

No commits specified - this is a data update task.

---

## Success Criteria

### Verification Commands

```bash
# Read the updated file and verify rates
cat src/data/recipes.json | grep -A 15 '"id": "craft-wolfram-wire"'  # Check wolfram wire
cat src/data/recipes.json | grep -A 15 '"id": "craft-stator"'  # Check stator
# ... repeat for all 13 recipes
```

### Final Checklist

- [ ] All 13 fabricator recipes updated
- [ ] All output rates match specifications
- [ ] All input rates match specifications
- [ ] Non-fabricator recipes unchanged
