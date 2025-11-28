import React from 'react';

interface FileSelectorProps {
    demoFile: string;
    uploadedFileName: string | null;
    onDemoFileChange: (file: string) => void;
    onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const FileSelector: React.FC<FileSelectorProps> = ({
    demoFile,
    uploadedFileName,
    onDemoFileChange,
    onFileUpload
}) => {
    return (
        <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div>
                <label htmlFor="demo-select" style={{ marginRight: 8 }}>Demo file:</label>
                <select 
                    id="demo-select" 
                    value={demoFile} 
                    onChange={(e) => onDemoFileChange(e.target.value)}
                >
                    <option value="demo-family.ged">Simple demo (2 parents, 3 children)</option>
                    <option value="demo-family-3gen.ged">3-generation demo</option>
                    <option value="ancestor-8gen.ged">Ancestor 8 generations (511 individuals)</option>
                    <option value="sample-from-image.ged">Sample from image (Cruz / Willow branch)</option>
                    <option value="Queen.ged">Queen (sample)</option>
                </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#666' }}>or</span>
                <label 
                    htmlFor="file-upload" 
                    style={{ 
                        padding: '6px 12px', 
                        background: '#007acc', 
                        color: 'white', 
                        borderRadius: 4, 
                        cursor: 'pointer',
                        fontSize: 14
                    }}
                >
                    Upload GEDCOM
                </label>
                <input 
                    id="file-upload" 
                    type="file" 
                    accept=".ged,.gedcom" 
                    onChange={onFileUpload}
                    style={{ display: 'none' }}
                />
                {uploadedFileName && (
                    <span style={{ fontSize: 13, color: '#666' }}>
                        ({uploadedFileName})
                    </span>
                )}
            </div>
        </div>
    );
};
