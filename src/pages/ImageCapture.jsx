import { useState, useRef, useCallback } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import Webcam from 'react-webcam'
import { Camera, FlipHorizontal, Trash2, Check, X, AlertCircle, Loader2 } from 'lucide-react'
import { analyzeImage } from '../services/imageAnalysis.js'

export default function ImageCapture() {
  const { patientId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { evidence = {}, extraFields = {} } = location.state ?? {}

  const webcamRef = useRef(null)
  const [images, setImages] = useState([])
  const [facingMode, setFacingMode] = useState('environment')
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResults, setAnalysisResults] = useState([])
  const [flashMsg, setFlashMsg] = useState('')
  const [permissionDenied, setPermissionDenied] = useState(false)

  const flash = (msg) => {
    setFlashMsg(msg)
    setTimeout(() => setFlashMsg(''), 2000)
  }

  const capture = useCallback(() => {
    const imgSrc = webcamRef.current?.getScreenshot()
    if (!imgSrc) return
    setImages(prev => [...prev, { src: imgSrc, id: crypto.randomUUID(), analysed: false }])
    flash('📸 Image captured!')
  }, [webcamRef])

  const removeImage = (id) => setImages(prev => prev.filter(img => img.id !== id))

  const analyseAll = async () => {
    if (images.length === 0) return
    setAnalyzing(true)
    const results = []

    for (const img of images) {
      try {
        // Extract base64 from data URL
        const base64 = img.src.split(',')[1]
        const mimeType = img.src.split(';')[0].split(':')[1]
        const result = await analyzeImage(base64, mimeType)
        results.push({ imageId: img.id, ...result })
      } catch (err) {
        console.error('Analysis error:', err)
        results.push({ imageId: img.id, error: err.message })
      }
    }

    setAnalysisResults(results)
    setAnalyzing(false)

    // Navigate to results
    const merged = results.reduce((acc, r) => {
      if (!r.error) {
        acc.no_clot = acc.no_clot || r.bn_evidence?.no_clot
        acc.bone_exposure = acc.bone_exposure || r.bn_evidence?.bone_exposure
        acc.inflammation = acc.inflammation || r.bn_evidence?.inflammation
        acc.debris = acc.debris || r.bn_evidence?.debris
      }
      return acc
    }, {})

    navigate(`/assessment/${patientId}`, {
      state: { capturedImages: images, analysisResults: results, mergedImageEvidence: merged },
      replace: true
    })
  }

  const videoConstraints = {
    facingMode,
    width: { ideal: 1280 },
    height: { ideal: 720 },
  }

  return (
    <div className="min-h-dvh bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur">
        <button onClick={() => navigate(-1)} className="text-white p-2">
          <X size={22} />
        </button>
        <span className="text-white font-semibold">Capture Images</span>
        <button onClick={() => setFacingMode(m => m === 'environment' ? 'user' : 'environment')}
          className="text-white p-2">
          <FlipHorizontal size={22} />
        </button>
      </div>

      {/* Camera */}
      <div className="flex-1 relative bg-black flex items-center justify-center">
        {permissionDenied ? (
          <div className="text-center px-8 text-white space-y-3">
            <AlertCircle size={48} className="text-risk-medium mx-auto" />
            <p className="font-semibold">Camera access denied</p>
            <p className="text-sm text-slate-400">Please allow camera access in your browser settings</p>
          </div>
        ) : (
          <>
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              videoConstraints={videoConstraints}
              onUserMediaError={() => setPermissionDenied(true)}
              className="w-full h-full object-cover"
              style={{ maxHeight: '60vh' }}
            />
            {/* Crosshair guide overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-2 border-white/40 rounded-2xl relative">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white rounded-tl-xl" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white rounded-tr-xl" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white rounded-bl-xl" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white rounded-br-xl" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-white/50 text-xs text-center">Align extraction<br/>site here</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Flash message */}
        {flashMsg && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white text-black px-4 py-2 rounded-full text-sm font-semibold animate-fade-in">
            {flashMsg}
          </div>
        )}
      </div>

      {/* Captured thumbnails */}
      {images.length > 0 && (
        <div className="flex gap-2 px-4 py-3 bg-black/80 overflow-x-auto">
          {images.map(img => (
            <div key={img.id} className="relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 border-primary">
              <img src={img.src} alt="captured" className="w-full h-full object-cover" />
              <button onClick={() => removeImage(img.id)}
                className="absolute top-0.5 right-0.5 bg-black/70 rounded-full p-0.5">
                <Trash2 size={11} className="text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="px-6 py-5 bg-black/90 flex items-center justify-between gap-4">
        <div className="text-white text-xs text-center min-w-[60px] flex flex-col gap-1 items-center">
          <span>{images.length} photo{images.length !== 1 ? 's' : ''}</span>
          <label className="text-primary hover:text-primary-light cursor-pointer font-semibold bg-primary/20 px-2 py-1 rounded-md mt-1">
            Upload
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={(e) => {
                const file = e.target.files[0]
                if (!file) return
                const reader = new FileReader()
                reader.onload = (event) => {
                  setImages(prev => [...prev, { src: event.target.result, id: crypto.randomUUID(), analysed: false }])
                  setFlashMsg('🖼️ Image uploaded!')
                  setTimeout(() => setFlashMsg(''), 2000)
                }
                reader.readAsDataURL(file)
              }}
            />
          </label>
        </div>

        {/* Capture button */}
        <button
          id="btn-capture"
          onClick={capture}
          disabled={permissionDenied}
          className="w-18 h-18 rounded-full border-4 border-white bg-white/20 hover:bg-white/30 active:scale-90 transition-all duration-150 flex items-center justify-center disabled:opacity-50"
          style={{ width: 72, height: 72 }}
        >
          <Camera size={30} className="text-white" />
        </button>

        {images.length > 0 ? (
          <button
            id="btn-analyse-images"
            onClick={analyseAll}
            disabled={analyzing}
            className="btn-primary text-xs px-3 py-2 flex items-center gap-1.5 min-w-[60px] justify-center"
          >
            {analyzing
              ? <Loader2 size={14} className="animate-spin" />
              : <><Check size={14} />Analyse</>
            }
          </button>
        ) : (
          <button onClick={() => navigate(-1)} className="text-slate-400 text-xs min-w-[60px]">
            Skip
          </button>
        )}
      </div>
    </div>
  )
}
