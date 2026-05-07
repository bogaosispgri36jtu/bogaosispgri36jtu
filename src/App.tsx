import React, { useState, useEffect, useRef } from 'react';
import { Camera, Settings, CheckCircle2, AlertCircle, RefreshCw, Upload, Image as ImageIcon } from 'lucide-react';
import { extractAnswersFromImage } from './lib/gemini';
import { motion, AnimatePresence } from 'motion/react';

type Tab = 'key' | 'scan';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('scan');
  const [answerKey, setAnswerKey] = useState<Record<number, string>>({});
  const [scannedAnswers, setScannedAnswers] = useState<Record<string, string | null> | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [showResultPopup, setShowResultPopup] = useState(false);

  // Load saved key from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('ljkApp_answerKey');
    if (saved) {
      try {
        setAnswerKey(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved key");
      }
    }
  }, []);

  const saveAnswerKey = (key: Record<number, string>) => {
    setAnswerKey(key);
    localStorage.setItem('ljkApp_answerKey', JSON.stringify(key));
  };

  const handleProcessImage = async (base64Img: string) => {
    setIsProcessing(true);
    setErrorMsg(null);
    setImageUrl(base64Img);
    try {
      const answers = await extractAnswersFromImage(base64Img);
      setScannedAnswers(answers);
      setShowResultPopup(true);
    } catch (e: any) {
      setErrorMsg(e.message || "Terjadi kesalahan saat memproses gambar.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 max-w-lg mx-auto w-full font-sans antialiased shadow-2xl border-x border-slate-200 relative overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white z-10 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white font-bold text-xl leading-none shadow-sm">S</div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">Koreksi <span className="text-blue-600 font-medium">Cepat</span></h1>
            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mt-0.5">Otomatis dengan AI</p>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative z-0">
        {errorMsg && (
          <div className="m-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-start gap-2 text-sm border border-red-100 font-medium">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{errorMsg}</p>
          </div>
        )}
        
        <AnimatePresence mode="wait">
          {activeTab === 'key' && (
            <motion.div
              key="tab-key"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full"
            >
              <AnswerKeySetup answerKey={answerKey} onSave={saveAnswerKey} onFinish={() => setActiveTab('scan')} />
            </motion.div>
          )}

          {activeTab === 'scan' && (
            <motion.div
              key="tab-scan"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full"
            >
              <Scanner isProcessing={isProcessing} onCapture={handleProcessImage} />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showResultPopup && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="absolute inset-0 z-50 flex flex-col bg-slate-50/50 backdrop-blur-md pb-safe"
            >
              <Results 
                answerKey={answerKey} 
                scannedAnswers={scannedAnswers} 
                imageUrl={imageUrl}
                onReset={() => {
                  setShowResultPopup(false);
                  setTimeout(() => {
                    setScannedAnswers(null);
                    setImageUrl(null);
                  }, 300);
                }} 
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-slate-100 flex shrink-0 pb-2 z-10">
        <button
          onClick={() => setActiveTab('key')}
          className={`flex-1 py-3 flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'key' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Settings className="w-6 h-6" />
          <span className="text-[10px] uppercase font-bold tracking-wider">Kunci Jawaban</span>
        </button>
        <button
          onClick={() => { setActiveTab('scan'); setShowResultPopup(false); }}
          className={`flex-1 py-3 flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'scan' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <div className={`p-3 rounded-xl -mt-8 shadow-lg transition-colors ${activeTab === 'scan' ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-slate-800 text-white shadow-slate-200'}`}>
             <Camera className="w-6 h-6" />
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider mt-1">Pindai</span>
        </button>
      </nav>
    </div>
  );
}

// ---------------------------------------------------------
// Answer Key Setup Component
// ---------------------------------------------------------
function AnswerKeySetup({ answerKey, onSave, onFinish }: { answerKey: Record<number, string>, onSave: (key: Record<number, string>) => void, onFinish: () => void }) {
  const [fastInput, setFastInput] = useState('');
  
  const options = ['A', 'B', 'C', 'D'];

  const handleFastInput = (val: string) => {
    const clean = val.toUpperCase().replace(/[^A-D]/g, '').slice(0, 50);
    setFastInput(clean);
    
    const newKey: Record<number, string> = { ...answerKey };
    for (let i = 0; i < clean.length; i++) {
      newKey[i + 1] = clean[i];
    }
    // If the input is shorter, clear the rest
    for (let i = clean.length; i < 50; i++) {
        delete newKey[i + 1];
    }
    onSave(newKey);
  };

  const handleToggle = (num: number, opt: string) => {
    const newKey = { ...answerKey };
    if (newKey[num] === opt) {
      delete newKey[num];
    } else {
      newKey[num] = opt;
    }
    onSave(newKey);
    // Sync fast input string if modified manually
    let str = "";
    for(let i=1; i<= (Object.keys(newKey).length ? Math.max(...Object.keys(newKey).map(Number)) : 0); i++) {
        str += newKey[i] || "-";
    }
    setFastInput(str.replace(/-+$/, '')); // trim trailing dashes
  };

  return (
    <div className="p-4 flex flex-col h-full relative">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-6 shrink-0">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Input Cepat Kunci Jawaban</h2>
        <p className="text-[10px] text-slate-400 mb-3 font-medium">Ketikkan A,B,C, atau D berurutan. (Contoh: AABCC...)</p>
        <textarea
          value={fastInput}
          onChange={(e) => handleFastInput(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-bold text-slate-700 uppercase tracking-[0.2em] focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none font-mono transition-shadow"
          rows={3}
          placeholder="Ketik kunci jawaban di sini..."
        />
        <div className="text-right text-[10px] font-bold text-slate-400 mt-2">
          {fastInput.length}/50 soal terisi
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-1">Atau Pilih Manual (1-50):</h2>
        <div className="grid grid-cols-2 gap-x-6 sm:gap-x-12 px-1">
          <div className="flex flex-col gap-y-4">
            {Array.from({ length: 25 }, (_, i) => i + 1).map((num) => (
              <div key={num} className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="w-5 sm:w-6 font-mono font-bold text-slate-400 text-[10px] sm:text-xs">{num}.</span>
                <div className="flex gap-1 sm:gap-1.5">
                  {options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handleToggle(num, opt)}
                      className={`w-6 h-6 sm:w-7 sm:h-7 rounded text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center ${
                        answerKey[num] === opt
                          ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200'
                          : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-y-4">
            {Array.from({ length: 25 }, (_, i) => i + 26).map((num) => (
              <div key={num} className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="w-5 sm:w-6 font-mono font-bold text-slate-400 text-[10px] sm:text-xs">{num}.</span>
                <div className="flex gap-1 sm:gap-1.5">
                  {options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handleToggle(num, opt)}
                      className={`w-6 h-6 sm:w-7 sm:h-7 rounded text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center ${
                        answerKey[num] === opt
                          ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200'
                          : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent">
        <button 
          onClick={onFinish}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-5 h-5" />
          Simpan Kunci Jawaban
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// Scanner Component (Camera / Upload)
// ---------------------------------------------------------
function Scanner({ isProcessing, onCapture }: { isProcessing: boolean, onCapture: (data: string) => void }) {
  const vRef = useRef<HTMLVideoElement>(null);
  const cRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } 
      });
      setStream(mediaStream);
      if (vRef.current) {
        vRef.current.srcObject = mediaStream;
        vRef.current.play().catch(e => console.error("Video play prevented:", e));
      }
    } catch (err: any) {
      console.error(err);
      setError("Tidak dapat mengakses kamera. Harap izinkan akses kamera atau gunakan fitur upload gambar.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  // Start cam on mount, clean up on unmount
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const takePhoto = () => {
    if (vRef.current && cRef.current) {
      const video = vRef.current;
      const canvas = cRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        stopCamera();
        onCapture(dataUrl);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        stopCamera();
        onCapture(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-6 bg-slate-900/90 backdrop-blur-sm z-50">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-slate-800 border-t-blue-500 rounded-full animate-spin"></div>
          <motion.div 
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <Camera className="w-8 h-8 text-blue-500" />
          </motion.div>
        </div>
        <p className="font-bold text-[10px] uppercase tracking-widest text-slate-400 animate-pulse">Memindai Dokumen...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.15)_0%,transparent_70%)] pointer-events-none z-0"></div>
      {error ? (
        <div className="p-6 text-white text-center flex flex-col items-center justify-center h-full relative z-10">
            <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
            <p className="mb-6 font-medium text-slate-300">{error}</p>
            <label className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold uppercase tracking-wide text-xs shadow-lg shadow-blue-500/20 flex items-center gap-2 cursor-pointer hover:bg-blue-700 transition">
                <ImageIcon className="w-5 h-5"/>
                Upload dari Galeri
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            </label>
            <button onClick={startCamera} className="mt-6 text-slate-400 text-xs font-bold uppercase tracking-wider hover:text-slate-200">Coba buka kamera lagi</button>
        </div>
      ) : (
        <>
          <video 
            ref={vRef} 
            autoPlay 
            playsInline
            muted
            className="w-full h-full object-cover relative z-10"
          />
          <canvas ref={cRef} className="hidden" />
          
          {/* Viewfinder overlay */}
          <div className="absolute inset-0 pointer-events-none z-20">
            <div className="absolute top-[10%] bottom-[20%] left-6 right-6 border-2 border-white/50 border-dashed rounded-2xl mix-blend-overlay"></div>
            <div className="absolute top-[50%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/50 text-[10px] uppercase font-bold tracking-widest text-center">
                Posisikan Pilihan Ganda
            </div>
          </div>
          
          <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-6 items-center px-8 z-30">
             <label className="w-12 h-12 bg-slate-800/80 backdrop-blur-md rounded-full flex items-center justify-center text-slate-300 cursor-pointer hover:text-white transition shadow-lg">
                <Upload className="w-5 h-5" />
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
             </label>
             <button 
               onClick={takePhoto}
               className="w-20 h-20 bg-blue-500/20 backdrop-blur-md rounded-full p-2 border border-blue-500/30"
             >
               <div className="w-full h-full bg-blue-500 rounded-full scale-100 active:scale-90 transition-transform shadow-[0_0_20px_rgba(59,130,246,0.5)]"></div>
             </button>
             <div className="w-12 h-12"></div> {/* Spacer for symmetry */}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------
// Results Component
// ---------------------------------------------------------
function Results({ 
  answerKey, 
  scannedAnswers, 
  onReset,
  imageUrl
}: { 
  answerKey: Record<number, string>; 
  scannedAnswers: Record<string, string | null> | null;
  onReset: () => void;
  imageUrl: string | null;
}) {
  if (!scannedAnswers) return null;

  // Let's assume standard max 50 max score based on the answered key keys.
  const totalQuestions = Object.keys(answerKey).length || 50; 
  let correct = 0;
  let wrong = 0;
  let missing = 0;

  const evaluation: any[] = [];

  for (let i = 1; i <= totalQuestions; i++) {
    const correctAns = answerKey[i];
    const userAns = scannedAnswers[i.toString()];
    
    let status = 'wrong';
    if (!userAns) {
        status = 'missing';
        missing++;
    } else if (userAns.toUpperCase() === correctAns?.toUpperCase()) {
        status = 'correct';
        correct++;
    } else {
        wrong++;
    }

    evaluation.push({ num: i, correctAns, userAns, status });
  }

  const score = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0;

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
        <div className="p-6 shrink-0 relative bg-white border-b border-slate-200 shadow-sm rounded-t-3xl mt-4 mx-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Hasil Evaluasi Otomatis</h3>
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 shadow-inner text-center relative overflow-hidden">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                       <div className="text-5xl font-black text-slate-800 mb-1">{score}<span className="text-2xl text-slate-300 font-light">/100</span></div>
                       <p className="text-sm font-medium text-slate-500 mt-1">Nilai Akhir Siswa</p>
                    </div>
                    {imageUrl && (
                        <div className="w-16 h-20 bg-slate-100 rounded-lg border border-slate-200 overflow-hidden shrink-0 shadow-sm absolute top-6 right-6">
                            <img src={imageUrl} alt="Scan preview" className="w-full h-full object-cover" />
                        </div>
                    )}
                </div>

                <div className="mt-6 flex gap-2">
                    <div className="flex-1 bg-green-100 border border-green-200 py-3 rounded-xl text-green-700 text-xs font-bold flex flex-col items-center justify-center">
                        <span className="font-black text-2xl mb-1">{correct}</span>
                        <span className="text-[10px] uppercase tracking-widest font-black opacity-80">Benar</span>
                    </div>
                    <div className="flex-1 bg-red-100 border border-red-200 py-3 rounded-xl text-red-700 text-xs font-bold flex flex-col items-center justify-center">
                        <span className="font-black text-2xl mb-1">{wrong}</span>
                        <span className="text-[10px] uppercase tracking-widest font-black opacity-80">Salah</span>
                    </div>
                    <div className="flex-1 bg-amber-100 border border-amber-200 py-3 rounded-xl text-amber-700 text-xs font-bold flex flex-col items-center justify-center">
                        <span className="font-black text-2xl mb-1">{missing}</span>
                        <span className="text-[10px] uppercase tracking-widest font-black opacity-80">Kosong</span>
                    </div>
                </div>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 mx-2 space-y-4 bg-white/50">
            <section>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 ml-2">Rincian Jawaban (1-50)</h3>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden divide-y divide-slate-100">
                  {evaluation.map((item) => (
                      <div key={item.num} className="p-3 flex items-center justify-between text-sm">
                          <div className="flex items-center gap-4">
                              <span className="w-6 font-mono font-bold text-slate-400 text-[10px] text-right">{item.num}.</span>
                              {item.status === 'correct' && (
                                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                              )}
                              {item.status === 'wrong' && (
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                                     <circle cx="12" cy="12" r="10"></circle><path d="m15 9-6 6"></path><path d="m9 9 6 6"></path>
                                  </svg>
                              )}
                              {item.status === 'missing' && (
                                  <div className="w-5 h-5 rounded-full border-2 border-dashed border-slate-300"></div>
                              )}
                              <div className="font-bold text-slate-800">
                                  {item.userAns || <span className="text-slate-300 italic">kosong</span>}
                              </div>
                          </div>
                          <div className="text-[10px] font-bold text-slate-400 font-mono flex gap-1 items-center bg-slate-50 px-2 py-1 rounded border border-slate-100">
                              <span>kunci:</span>
                              <span className="font-black text-slate-600">{item.correctAns || '-'}</span>
                          </div>
                      </div>
                  ))}
              </div>
              <div className="px-2 pb-4">
                  <button 
                    onClick={onReset}
                    className="mt-6 w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-blue-500/20 active:scale-[0.98]"
                  >
                      <Camera className="w-5 h-5" />
                      Tutup & Pindai Baru
                  </button>
              </div>
            </section>
        </div>
    </div>
  );
}

