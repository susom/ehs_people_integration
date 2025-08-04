# EHS People Integration External Module

This External Module (EM) provides two main tools for REDCap projects at Stanford:

## 1. Dashboard

- **What it is:**  
  A simple, one-page ReactJS app.
- **What it does:**  
  Pulls records from your REDCap project using the instruments specified in the project EM settings.
- **Features:**  
  - Displays data in a user-friendly dashboard.
  - Allows users to filter records based on criteria.

## 2. OSHA Report Generator

- **What it is:**  
  A ReactJS app for OSHA 300 reporting.
- **What it does:**  
  - Lets users generate an Excel file from the OSHA 300 form template.
  - Fills the Excel with records based on a user-selected date range.
- **How it works:**  
  - The generated Excel file is uploaded to a Google Storage bucket (configured in project EM settings).
  - The module then attempts to download the file to the user’s machine.
- **Access Requirements:**  
  - To download the Excel file, you **must** be a member of a Stanford workgroup with access to the storage bucket.
  - The workgroup currently authorized for downloads:  
    `med-research-it_cloud-ops-redcap-ehs-admins@stanford.edu`

---

## Setup and Usage

1. **Install the module** via the REDCap External Module manager.
2. **Configure the EM settings**:
   - Specify target REDCap instruments for the dashboard.
   - Provide Google Storage bucket credentials for the OSHA report generator.
3. **Access the dashboard and report generator** from your project’s EM interface.

## Technologies Used

- ReactJS (JavaScript)
- REDCap External Module framework
- Google Cloud Storage (for OSHA report files)
- Excel file generation

## Notes

- Access to the OSHA report files is restricted. Make sure your Stanford workgroup permissions are up to date.
- For support, contact the REDCap EHS admin team.

---

## License

See the repository for license details.
