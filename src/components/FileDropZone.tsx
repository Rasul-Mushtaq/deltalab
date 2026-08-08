// Landing upload zone: drag-and-drop, file validation, progress display.
// Also hosts the bundled sample datasets (heart disease, titanic).

import { useCallback, useRef, useState } from "react";
import {
  UploadCloud,
  FileText,
  Loader2,
  X,
  HeartPulse,
  Ship,
} from "lucide-react";
import type { WorkerProgress } from "../types/profiler";

interface FileDropZoneProps {
  onFileSelected: (file: File) => void;
  isProcessing: boolean;
  progress: WorkerProgress | null;
  onCancel: () => void;
}

const HEART_DISEASE_CSV = `age,sex,cp,trestbps,chol,fbs,restecg,thalach,exang,oldpeak,slope,ca,thal,target
63,1,3,145,233,1,0,150,0,2.3,0,0,1,1
37,1,2,130,250,0,1,187,0,3.5,0,0,2,1
41,0,1,130,204,0,0,172,0,1.4,2,0,2,1
56,1,1,120,236,0,1,178,0,0.8,2,0,2,1
57,0,0,120,354,0,1,163,1,0.6,2,0,2,1
57,1,0,140,192,0,1,148,0,0.4,1,0,1,1
56,0,1,140,294,0,0,153,0,1.3,1,0,2,1
44,1,1,120,263,0,1,173,0,0,2,0,3,1
52,1,2,172,199,1,1,162,0,0.5,2,0,3,1
57,1,2,150,168,0,1,174,0,1.6,2,0,2,1
54,1,0,140,239,0,1,160,0,1.2,2,0,2,1
48,0,2,130,275,0,1,139,0,0.2,2,0,2,1
49,1,1,130,266,0,1,171,0,0.6,2,0,2,1
64,1,3,110,211,0,0,144,1,1.8,1,0,2,1
58,0,3,150,283,1,0,162,0,1,2,0,2,1
50,0,2,120,219,0,1,158,0,1.6,1,0,2,1
58,0,2,120,340,0,1,172,0,0,2,0,2,1
66,0,3,150,226,0,1,114,0,2.6,0,0,2,1
43,1,0,150,247,0,1,171,0,1.5,2,0,2,1
69,0,3,140,239,0,1,151,0,1.8,2,2,2,1
59,1,0,135,234,0,1,161,0,0.5,1,0,3,1
44,1,2,130,233,0,1,179,1,0.4,2,0,2,1
42,1,0,140,226,0,1,178,0,0,2,0,2,1
43,1,2,120,177,0,0,120,1,2.5,1,0,2,1
57,1,2,150,276,0,1,112,1,0.6,1,1,1,1
55,1,1,130,353,0,1,150,1,1.2,1,0,2,1
61,1,1,130,330,0,1,169,0,0,2,0,2,1
40,1,1,110,167,0,0,114,1,2,1,0,2,1
60,1,2,150,240,0,1,171,0,0.9,2,0,2,1
59,1,2,135,234,0,1,161,0,0.5,1,0,3,1`;

const TITANIC_CSV = `PassengerId,Survived,Pclass,Name,Sex,Age,SibSp,Parch,Ticket,Fare,Cabin,Embarked
1,0,3,"Braund, Mr. Owen Harris",male,22,1,0,A/5 21171,7.25,,S
2,1,1,"Cumings, Mrs. John Bradley (Florence Briggs Thayer)",female,38,1,0,PC 17599,71.2833,C85,C
3,1,3,"Heikkinen, Miss. Laina",female,26,0,0,STON/O2. 3101282,7.925,,S
4,1,1,"Futrelle, Mrs. Jacques Heath (Lily May Peel)",female,35,1,0,113803,53.1,C123,S
5,0,3,"Allen, Mr. William Henry",male,35,0,0,373450,8.05,,S
6,0,3,"Moran, Mr. James",male,,0,0,330877,8.4583,,Q
7,0,1,"McCarthy, Mr. Timothy J",male,54,0,0,17463,51.8625,E46,S
8,0,3,"Palsson, Master. Gosta Leonard",male,2,3,1,349909,21.075,,S
9,1,3,"Johnson, Mrs. Oscar W (Elisabeth Vilhelmina Berg)",female,27,0,2,347742,11.1333,,S
10,1,2,"Nasser, Mrs. Nicholas (Adele Achem)",female,14,1,0,237736,30.0708,,C
11,1,3,"Sandstrom, Miss. Marguerite Rut",female,4,1,1,PP 9549,16.7,G6,S
12,1,1,"Bonnell, Miss. Elizabeth",female,58,0,0,113783,26.55,C103,S
13,0,3,"Saundercock, Mr. William Henry",male,20,0,0,A/5. 2151,8.05,,S
14,0,3,"Andersson, Mr. Anders Johan",male,39,1,5,347082,31.275,,S
15,0,3,"Vestrom, Miss. Hulda Amanda Adolfina",female,14,0,0,350406,7.8542,,S
16,1,2,"Hewlett, Mrs. (Mary D Kingcome)",female,55,0,0,248706,16,,S
17,0,3,"Rice, Master. Eugene",male,2,4,1,382652,29.125,,Q
18,1,2,"Williams, Mr. Charles Eugene",male,,0,0,244373,13,,S
19,0,3,"Vander Planke, Mrs. Julius (Emelia Maria Vandemoortele)",female,31,1,0,345763,18,,S
20,1,3,"Masselmani, Mrs. Fatima",female,,0,0,2649,7.225,,C`;

export default function FileDropZone({
  onFileSelected,
  isProcessing,
  progress,
  onCancel,
}: FileDropZoneProps) {
  // Local UI state for drag highlight and validation errors.
  const [isDragging, setIsDragging] = useState(false);
  const [dragError, setDragError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Only accept .csv and .json uploads.
  const validateFile = (file: File): boolean => {
    const name = file.name.toLowerCase();
    if (name.endsWith(".csv") || name.endsWith(".json")) {
      setDragError(null);
      return true;
    }
    setDragError("Unsupported file type. Please upload a .csv or .json file.");
    return false;
  };

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      if (validateFile(file)) {
        onFileSelected(file);
      }
    },
    [onFileSelected],
  );

  // Build a File object from an embedded sample CSV.
  const handleSampleLoad = useCallback(
    (csv: string, filename: string) => {
      const file = new File([csv], filename, { type: "text/csv" });
      onFileSelected(file);
    },
    [onFileSelected],
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const percent = progress?.percent ?? 0;

  return (
    <div className="w-full max-w-lg mx-auto">
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 transition-all duration-300 ease-out cursor-pointer ${
          isDragging
            ? "border-lime-pulse bg-lime-pulse/5"
            : "border-circuit-border bg-ground-iron hover:border-sage-40"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (!isProcessing && inputRef.current) inputRef.current.click();
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.json"
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />

        <div className="flex flex-col items-center gap-4 py-8">
          {isProcessing ? (
            <>
              <div className="w-20 h-20 rounded-full bg-carbon-veil flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-lime-pulse animate-spin" />
              </div>
              <h3 className="font-goga text-heading-sm text-phosphor-white">
                {progress?.message || "Processing..."}
              </h3>
              <div className="w-full max-w-xs">
                <div className="h-1.5 w-full bg-carbon-veil rounded-full overflow-hidden">
                  <div
                    className="h-full bg-lime-pulse rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <p className="text-caption text-sage-40 mt-2 text-center">
                  {percent.toFixed(0)}%
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCancel();
                }}
                className="inline-flex items-center gap-2 text-body-sm text-sage-60 hover:text-phosphor-white transition-colors duration-300"
              >
                <X className="w-5 h-5" />
                Cancel
              </button>
            </>
          ) : (
            <>
              <div className="w-30 h-30 rounded-lg bg-carbon-veil flex items-center justify-center">
                <UploadCloud className="w-13 h-13 text-lime-pulse" />
              </div>
              <div className="text-center">
                <h3 className="font-goga text-heading-sm text-phosphor-white">
                  Drop your dataset here
                </h3>
                <p className="text-body text-sage-60 mt-2 max-w-sm">
                  to generate an instant statistical profile. All your data stay
                  on the browser (no third party servers)
                </p>
              </div>
              <span className="inline-flex items-center gap-2 text-body-sm text-fern-link mt-2">
                <FileText className="w-5 h-5" />
                .CSV or .JSON
              </span>
            </>
          )}
        </div>
      </div>

      {!isProcessing && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <span className="text-caption text-sage-40 uppercase tracking-wider">
            Or try a sample:
          </span>
          <button
            onClick={() =>
              handleSampleLoad(HEART_DISEASE_CSV, "heart_disease.csv")
            }
            className="inline-flex items-center gap-2 tag tag-neutral hover:border-lime-pulse hover:text-phosphor-white transition-colors duration-300 cursor-pointer"
          >
            <HeartPulse className="w-5 h-5 text-lime-pulse" />
            Try Heart Disease CSV
          </button>
          <button
            onClick={() => handleSampleLoad(TITANIC_CSV, "titanic.csv")}
            className="inline-flex items-center gap-2 tag tag-neutral hover:border-lime-pulse hover:text-phosphor-white transition-colors duration-300 cursor-pointer"
          >
            <Ship className="w-5 h-5 text-moss-70" />
            Try Titanic CSV
          </button>
        </div>
      )}

      {dragError && (
        <div className="mt-4 p-4 rounded-lg bg-charcoal-rust border border-circuit-border">
          <p className="text-body-sm text-phosphor-white">{dragError}</p>
        </div>
      )}
    </div>
  );
}
