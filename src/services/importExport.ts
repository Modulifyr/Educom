import * as XLSX from 'xlsx';

export interface ImportMapping {
  sourceColumn: string;
  targetField: string;
  transform?: (value: unknown) => unknown;
}

export interface ImportResult {
  success: boolean;
  recordsImported: number;
  errors: { row: number; message: string }[];
  skipped: number;
}

export interface ExportOptions {
  format: 'csv' | 'xlsx' | 'json';
  filename: string;
  sheetName?: string;
}

const standardMappings: Record<string, ImportMapping[]> = {
  students: [
    { sourceColumn: 'Admission Number', targetField: 'admissionNumber' },
    { sourceColumn: 'First Name', targetField: 'firstName' },
    { sourceColumn: 'Last Name', targetField: 'lastName' },
    { sourceColumn: 'Date of Birth', targetField: 'dateOfBirth', transform: (v) => String(v) },
    { sourceColumn: 'Gender', targetField: 'gender', transform: (v) => String(v).toLowerCase() },
    { sourceColumn: 'Class', targetField: 'classId' },
    { sourceColumn: 'Section', targetField: 'section' },
    { sourceColumn: 'Parent Name', targetField: 'parentName' },
    { sourceColumn: 'Parent Phone', targetField: 'parentPhone' },
    { sourceColumn: 'Address', targetField: 'address' }
  ],
  staff: [
    { sourceColumn: 'Employee ID', targetField: 'employeeId' },
    { sourceColumn: 'First Name', targetField: 'firstName' },
    { sourceColumn: 'Last Name', targetField: 'lastName' },
    { sourceColumn: 'Designation', targetField: 'designation' },
    { sourceColumn: 'Department', targetField: 'department' },
    { sourceColumn: 'Date of Joining', targetField: 'dateOfJoining', transform: (v) => String(v) },
    { sourceColumn: 'Phone', targetField: 'phone' },
    { sourceColumn: 'Email', targetField: 'email' },
    { sourceColumn: 'Salary', targetField: 'salary', transform: (v) => Number(v) }
  ],
  attendance: [
    { sourceColumn: 'Date', targetField: 'date', transform: (v) => String(v) },
    { sourceColumn: 'Student ID', targetField: 'studentId' },
    { sourceColumn: 'Staff ID', targetField: 'staffId' },
    { sourceColumn: 'Status', targetField: 'status', transform: (v) => String(v).toLowerCase() },
    { sourceColumn: 'Remarks', targetField: 'remarks' }
  ],
  inventory: [
    { sourceColumn: 'Item Code', targetField: 'itemCode' },
    { sourceColumn: 'Name', targetField: 'name' },
    { sourceColumn: 'Category', targetField: 'category' },
    { sourceColumn: 'Quantity', targetField: 'quantity', transform: (v) => Number(v) },
    { sourceColumn: 'Unit', targetField: 'unit' },
    { sourceColumn: 'Unit Price', targetField: 'unitPrice', transform: (v) => Number(v) },
    { sourceColumn: 'Supplier', targetField: 'supplier' },
    { sourceColumn: 'Reorder Level', targetField: 'reorderLevel', transform: (v) => Number(v) }
  ],
  fees: [
    { sourceColumn: 'Student ID', targetField: 'studentId' },
    { sourceColumn: 'Fee Type', targetField: 'feeType' },
    { sourceColumn: 'Amount', targetField: 'amount', transform: (v) => Number(v) },
    { sourceColumn: 'Due Date', targetField: 'dueDate', transform: (v) => String(v) },
    { sourceColumn: 'Academic Year', targetField: 'academicYear' }
  ]
};

export const importExportService = {
  async parseSpreadsheet(file: File): Promise<{ headers: string[]; data: Record<string, unknown>[] }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as (string | number | null)[][];
          
          if (jsonData.length < 2) {
            reject(new Error('File must contain headers and at least one data row'));
            return;
          }
          
          const headers = jsonData[0].map(h => String(h ?? ''));
          const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== null && cell !== ''));
          
          const records = rows.map(row => {
            const record: Record<string, unknown> = {};
            headers.forEach((header, index) => {
              record[header] = row[index] ?? null;
            });
            return record;
          });
          
          resolve({ headers, data: records });
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  },

  autoMapColumns(headers: string[], module: string): ImportMapping[] {
    const mappings = standardMappings[module] || [];
    const autoMappings: ImportMapping[] = [];
    
    for (const header of headers) {
      const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
      const match = mappings.find(m => {
        const normalizedTarget = m.targetField.toLowerCase().replace(/[^a-z0-9]/g, '');
        const normalizedSource = m.sourceColumn.toLowerCase().replace(/[^a-z0-9]/g, '');
        return normalizedHeader.includes(normalizedTarget) || normalizedTarget.includes(normalizedHeader) ||
               normalizedHeader.includes(normalizedSource) || normalizedSource.includes(normalizedHeader);
      });
      
      if (match) {
        autoMappings.push({ sourceColumn: header, targetField: match.targetField, transform: match.transform });
      } else {
        autoMappings.push({ sourceColumn: header, targetField: header });
      }
    }
    
    return autoMappings;
  },

  transformData(data: Record<string, unknown>[], mappings: ImportMapping[]): Record<string, unknown>[] {
    return data.map(row => {
      const transformed: Record<string, unknown> = {};
      for (const mapping of mappings) {
        const value = row[mapping.sourceColumn];
        transformed[mapping.targetField] = mapping.transform ? mapping.transform(value) : value;
      }
      return transformed;
    });
  },

  async exportData(data: unknown[], options: ExportOptions): Promise<void> {
    const { format, filename, sheetName = 'Data' } = options;
    
    let blob: Blob;
    
    if (format === 'json') {
      blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    } else if (format === 'csv') {
      const worksheet = XLSX.utils.json_to_sheet(data as Record<string, unknown>[]);
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      blob = new Blob([csv], { type: 'text/csv' });
    } else {
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(data as Record<string, unknown>[]);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    }
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith(`.${format}`) ? filename : `${filename}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  getStandardMappings(module: string): ImportMapping[] {
    return standardMappings[module] || [];
  }
};
