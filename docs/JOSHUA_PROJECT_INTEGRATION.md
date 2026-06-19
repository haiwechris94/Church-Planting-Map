# Joshua Project Integration Guide

This guide explains how to import unreached people groups data from Joshua Project into the Church Planting Map application.

## About Joshua Project

[Joshua Project](https://joshuaproject.net) is a research initiative that provides comprehensive data on unreached people groups worldwide. They offer:
- Detailed information on 17,000+ people groups
- Population statistics
- Religious demographics
- Geographic locations
- Progress indicators

## Accessing Joshua Project Data for Cameroon

### Option 1: Download CSV from Joshua Project Website

1. **Visit Joshua Project**
   - Go to [https://joshuaproject.net](https://joshuaproject.net)

2. **Navigate to Cameroon Data**
   - Go to: [https://joshuaproject.net/countries/CM](https://joshuaproject.net/countries/CM)
   - Or search for "Cameroon" in the search bar

3. **Download People Groups List**
   - Click on "All Peoples" tab
   - Look for "Download" or "Export" option
   - Select CSV format
   - Save the file

### Option 2: Use Joshua Project API

Joshua Project provides a free API for accessing their data:

1. **Get an API Key**
   - Register at [https://joshuaproject.net/api](https://joshuaproject.net/api)
   - Request an API key (free for non-commercial use)

2. **API Endpoint for Cameroon People Groups**
   ```
   https://joshuaproject.net/api/v2/people_groups?api_key=YOUR_API_KEY&countries=CM
   ```

3. **Example API Response Fields**
   - `PeopNameInCountry` - People group name
   - `Population` - Population count
   - `Latitude` - Geographic latitude
   - `Longitude` - Geographic longitude
   - `PrimaryReligion` - Primary religion
   - `PrimaryLanguageName` - Primary language
   - `JPScale` - Progress scale (1-5)
   - `PercentEvangelical` - Evangelical percentage

## Field Mapping

Map Joshua Project fields to Church Planting Map fields:

| Joshua Project Field | Church Planting Map Field | Notes |
|---------------------|---------------------------|-------|
| `PeopNameInCountry` | `name` | People group name |
| `Population` | `population` | Population count |
| `Latitude` | `latitude` | Geographic latitude |
| `Longitude` | `longitude` | Geographic longitude |
| `PrimaryLanguageName` | `language` | Primary language |
| `PrimaryReligion` | `religion` | Primary religion |
| `ROG3` | `region` | Region code (map to region name) |
| `Ctry` | `country` | Should be "Cameroon" |
| `JPScale` | `status` | Map: 1-2 = unreached, 3 = pioneer, 4 = midway, 5 = tipping-point |

### Status Mapping from JPScale

Joshua Project uses a 1-5 scale:
- **1** (Unreached) → `unreached`
- **2** (Minimally Reached) → `unreached`
- **3** (Superficially Reached) → `pioneer`
- **4** (Partially Reached) → `midway`
- **5** (Significantly Reached) → `tipping-point`

## Preparing Your CSV for Import

### Required CSV Format

Your CSV file should have these columns (semicolon or comma separated):

```csv
name;villageName;numberOfChurches;churchGeneration;description;latitude;longitude;status;engagementStatus;population;region;country
Bamileke;Bafoussam;0;0;Large ethnic group in West Region;5.4737;10.4179;unreached;unreached;500000;Ouest;Cameroon
```

### Step-by-Step CSV Preparation

1. **Download Joshua Project data** (CSV or via API)

2. **Open in spreadsheet software** (Excel, Google Sheets, LibreOffice)

3. **Rename/add columns** to match the required format:
   - Rename `PeopNameInCountry` → `name`
   - Rename `Population` → `population`
   - Rename `Latitude` → `latitude`
   - Rename `Longitude` → `longitude`
   - Rename `PrimaryLanguageName` → `language`
   - Rename `PrimaryReligion` → `religion`
   - Add `country` column with value "Cameroon"
   - Add `status` column (map from JPScale)
   - Add `engagementStatus` column (same as status for new entries)
   - Add `numberOfChurches` column (default: 0)
   - Add `churchGeneration` column (default: 0)

4. **Map regions** - Convert Joshua Project region codes to Cameroon region names:
   - `CE` → Centre
   - `AD` → Adamawa
   - `ES` → Est
   - `EN` → Extrême-Nord
   - `LT` → Littoral
   - `NO` → Nord
   - `NW` → Nord-Ouest
   - `OU` → Ouest
   - `SU` → Sud
   - `SW` → Sud-Ouest

5. **Save as CSV** with semicolon (;) or comma (,) delimiter

## Using the Import Feature

1. **Navigate to Data Management**
   - Go to the Data Management page in the app
   - Find the "Import People Groups" section

2. **Download Template** (optional)
   - Click "Download Template" to get a sample CSV
   - Use this as a reference for formatting

3. **Validate Your File**
   - Click "Validate" to check your CSV before importing
   - Fix any errors reported

4. **Import**
   - Click "Import" to add the people groups
   - Review the import summary

## Using the Helper Script

A helper script is provided to automate the transformation of Joshua Project data:

### Location
```
scripts/transformJoshuaProjectData.js
```

### Usage

1. **Download Joshua Project CSV** for Cameroon

2. **Place the file** in the project root as `joshua-project-cameroon.csv`

3. **Run the script**:
   ```bash
   node scripts/transformJoshuaProjectData.js
   ```

4. **Output**: The script creates `joshua-project-transformed.csv` ready for import

### Script Features
- Automatically maps Joshua Project fields to app fields
- Converts JPScale to status values
- Maps region codes to region names
- Handles missing data gracefully
- Outputs CSV in the correct format

## Best Practices

1. **Start Small**: Import a few people groups first to verify the process

2. **Verify Coordinates**: Ensure latitude/longitude values are within Cameroon's bounds:
   - Latitude: 1.6° to 13.1° N
   - Longitude: 8.5° to 16.2° E

3. **Check for Duplicates**: The import will skip people groups with the same name

4. **Update Regularly**: Joshua Project updates their data periodically

5. **Add Local Knowledge**: After import, update entries with local information:
   - Village names
   - Number of churches
   - Church generations
   - Local descriptions

## Troubleshooting

### Common Issues

1. **"Invalid coordinates" error**
   - Ensure latitude and longitude are valid numbers
   - Check that coordinates are within Cameroon

2. **"Name is required" error**
   - Ensure every row has a people group name

3. **Encoding issues**
   - Save CSV as UTF-8 encoding
   - Use semicolon (;) delimiter for French locale

4. **Status not recognized**
   - Use valid status values: unreached, pioneer, midway, tipping-point, dmm

### Getting Help

- Check the sample CSV at `frontend/public/data/sample-people-groups.csv`
- Review the import validation errors for specific issues
- Contact support for additional assistance

## Additional Resources

- [Joshua Project API Documentation](https://joshuaproject.net/api)
- [Joshua Project Data Definitions](https://joshuaproject.net/resources/articles/how_to_use_data)
- [Cameroon People Groups on Joshua Project](https://joshuaproject.net/countries/CM)
