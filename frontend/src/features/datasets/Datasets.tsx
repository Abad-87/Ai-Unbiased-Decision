import { useState } from 'react';
import { Upload, Database, Trash2, CheckCircle, AlertCircle } from 'lucide-react';

export function Datasets() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [columns, setColumns] = useState([
    { name: "age", type: "numeric", role: "feature" },
    { name: "gender", type: "categorical", role: "protected" },
    { name: "income", type: "numeric", role: "feature" },
    { name: "credit_score", type: "numeric", role: "feature" },
    { name: "loan_approved", type: "binary", role: "target" },
    { name: "region", type: "categorical", role: "feature" },
  ]);

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.csv') || droppedFile.name.endsWith('.json'))) {
      setFile(droppedFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const uploadDataset = () => {
    if (!file) return;
    setIsUploading(true);

    setTimeout(() => {
      setIsUploading(false);
      setUploadSuccess(true);
      alert(`✅ Dataset "${file.name}" uploaded successfully!`);
    }, 1600);
  };

  const updateRole = (index: number, newRole: string) => {
    const updated = [...columns];
    updated[index].role = newRole;
    setColumns(updated);
  };

  const removeColumn = (index: number) => {
    setColumns(columns.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-semibold dark:text-white flex items-center gap-3">
          <Database className="text-emerald-600" size={32} />
          Datasets & Models
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">
          Upload your dataset and configure protected attributes
        </p>
      </div>

      {/* Upload Zone */}
      <div 
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleFileDrop}
        className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-3xl p-16 text-center hover:border-emerald-500 transition-colors"
      >
        {file ? (
          <div className="space-y-4">
            <CheckCircle className="mx-auto text-emerald-600" size={48} />
            <div>
              <p className="font-medium dark:text-white">{file.name}</p>
              <p className="text-sm text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <button
              onClick={uploadDataset}
              disabled={isUploading}
              className="mt-4 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-400 text-white rounded-2xl font-medium"
            >
              {isUploading ? "Uploading..." : "Upload & Process Dataset"}
            </button>
          </div>
        ) : (
          <>
            <Upload className="mx-auto text-zinc-400 mb-6" size={48} />
            <h3 className="text-xl font-medium dark:text-white">Drag & drop your dataset</h3>
            <p className="text-zinc-500 mt-2">Supports CSV, JSON, Parquet</p>
            <label className="mt-6 inline-block px-8 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-2xl cursor-pointer">
              Choose File
              <input 
                type="file" 
                className="hidden" 
                accept=".csv,.json" 
                onChange={handleFileSelect}
              />
            </label>
          </>
        )}
      </div>

      {/* Column Configuration */}
      {uploadSuccess && (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-zinc-800">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-semibold dark:text-white">Column Configuration</h2>
            <div className="text-sm text-emerald-600">5 columns detected • 1 protected attribute</div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b dark:border-zinc-700">
                  <th className="text-left py-4 text-zinc-600 dark:text-zinc-400 font-medium">Column Name</th>
                  <th className="text-left py-4 text-zinc-600 dark:text-zinc-400 font-medium">Type</th>
                  <th className="text-left py-4 text-zinc-600 dark:text-zinc-400 font-medium">Role</th>
                  <th className="w-20"></th>
                </tr>
              </thead>
              <tbody>
                {columns.map((col, index) => (
                  <tr key={index} className="border-b dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                    <td className="py-5 font-medium dark:text-white">{col.name}</td>
                    <td className="py-5 text-zinc-600 dark:text-zinc-400">{col.type}</td>
                    <td className="py-5">
                      <select
                        value={col.role}
                        onChange={(e) => updateRole(index, e.target.value)}
                        className="bg-zinc-100 dark:bg-zinc-800 border border-transparent focus:border-emerald-500 rounded-xl px-4 py-2 text-sm dark:text-white"
                      >
                        <option value="feature">Feature</option>
                        <option value="protected">Protected Attribute</option>
                        <option value="target">Target</option>
                      </select>
                    </td>
                    <td className="py-5 text-right">
                      <button
                        onClick={() => removeColumn(index)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-10 flex gap-4">
            <button className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-2xl">
              Save Configuration
            </button>
            <button className="flex-1 py-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 font-medium rounded-2xl">
              Connect to Model
            </button>
          </div>
        </div>
      )}

      {/* Tips */}
      {!uploadSuccess && (
        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-3xl p-8">
          <div className="flex items-start gap-5">
            <AlertCircle className="text-amber-600 mt-1" size={28} />
            <div>
              <h3 className="font-semibold text-amber-800 dark:text-amber-300">How to use this page</h3>
              <ul className="mt-4 space-y-2 text-sm text-amber-700 dark:text-amber-400">
                <li>• Upload your dataset (CSV recommended)</li>
                <li>• Mark protected attributes (gender, age, region, etc.)</li>
                <li>• Identify the target column (e.g., loan_approved)</li>
                <li>• Save configuration before running bias detection</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}