# GEDCOM Specification for Family Tree Framework

## Overview
GEDCOM (Genealogical Data Communication) is a standard file format for representing genealogical information. This document outlines the structure and elements of GEDCOM files as they relate to the Family Tree Framework.

## GEDCOM File Structure
A GEDCOM file consists of a series of lines, each beginning with a level number followed by a tag and optional data. The basic structure is as follows:

```
0 @I1@ INDI
1 NAME John /Doe/
1 SEX M
1 BIRT
2 DATE 1 JAN 1900
2 PLAC New York, USA
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@
```

### Level Numbers
- **0**: Top-level record (e.g., Individual, Family)
- **1**: Sub-level record (e.g., Name, Sex, Birth)
- **2**: Further sub-level record (e.g., Date, Place)

### Tags
Common tags used in GEDCOM files include:
- `INDI`: Individual record
- `NAME`: Name of the individual
- `SEX`: Gender of the individual
- `BIRT`: Birth event
- `DEAT`: Death event
- `FAM`: Family record
- `HUSB`: Husband in a family
- `WIFE`: Wife in a family
- `CHIL`: Child in a family

## Data Types
The framework will utilize the following data types based on GEDCOM specifications:

### Individual
```typescript
interface Individual {
    id: string;
    name: string;
    sex: 'M' | 'F';
    birth?: Event;
    death?: Event;
}
```

### Family
```typescript
interface Family {
    id: string;
    parents: string[]; // ID of the husband/wife
    children: string[]; // Array of child IDs
}
```

### Event
```typescript
interface Event {
    date: string; // Date of the event
    place: string; // Place of the event
}
```

## Importing GEDCOM Files
The framework provides a function `parseGedcom` that takes a GEDCOM file as input and returns a structured representation of the family tree, including individuals and families.

## Conclusion
This specification serves as a guide for developers working with GEDCOM files within the Family Tree Framework, ensuring consistent handling of genealogical data.