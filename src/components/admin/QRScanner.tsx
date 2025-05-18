'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Define an interface for parsed QR data
interface ParsedQRData {
  ticketId: string;
  timestamp?: number;
  signature?: string;
  nonce?: string;
  [key: string]: unknown;
}

interface QRScannerProps {
  onScan?: (result: string) => void;
  onError?: (error: string) => void;
  redirectToVerify?: boolean;
}

export default function QRScanner({ 
  onScan, 
  onError, 
  redirectToVerify = true 
}: QRScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCamera, setHasCamera] = useState(false);
  const [hasBarcodeDetector, setHasBarcodeDetector] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [supportedFormats, setSupportedFormats] = useState<string[]>([]);
  const [manualTicketId, setManualTicketId] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const router = useRouter();
  
  // Setup camera and scanner
  useEffect(() => {
    // More reliable iOS detection
    const userAgent = navigator.userAgent || navigator.vendor;
    const isIOSDevice = !!(/iPad|iPhone|iPod/.test(userAgent) || 
                       (navigator.platform && /iPad|iPhone|iPod/.test(navigator.platform)));
    setIsIOS(isIOSDevice);

    // Check if BarcodeDetector is available and get supported formats
    if ('BarcodeDetector' in window) {
      try {
        // @ts-expect-error - BarcodeDetector may not be recognized by TypeScript
        BarcodeDetector.getSupportedFormats()
          .then((formats: string[]) => {
            setHasBarcodeDetector(true);
            setSupportedFormats(formats);
            console.log('Supported formats:', formats);
          })
          .catch((err: unknown) => {
            console.error('Error getting supported formats:', err);
            setHasBarcodeDetector(false);
          });
      } catch (error) {
        console.error('Error checking BarcodeDetector support:', error);
        setHasBarcodeDetector(false);
      }
    } else {
      console.log('Barcode Detector is not supported by this browser.');
      setHasBarcodeDetector(false);
    }

    // Request camera permissions early on iOS to avoid potential issues
    if (isIOSDevice) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(() => console.log('Camera permission granted'))
        .catch(err => console.log('Camera permission error:', err));
    }

    // Check for camera availability
    navigator.mediaDevices.enumerateDevices()
      .then(devices => {
        const hasVideoInput = devices.some(device => device.kind === 'videoinput');
        setHasCamera(hasVideoInput);
        if (!hasVideoInput) {
          setError('未檢測到相機。請確保您的設備有攝像頭並已授權使用。');
          if (onError) onError('No camera detected');
        }
      })
      .catch(err => {
        console.error('Error checking camera:', err);
        setError('檢查相機時出錯，請確保已授予相機權限。');
        if (onError) onError(err.message);
      });
  }, [onError]);

  // Start scanning function
  const startScanner = async () => {
    if (!videoRef.current) return;
    
    try {
      setScanning(true);
      setError(null);
      
      // Optimized settings for iOS
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: isIOS ? 1920 : 1280 },
          height: { ideal: isIOS ? 1080 : 720 },
        }
      };
      
      // Get video stream
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true'); // Important for iOS Safari
        videoRef.current.setAttribute('autoplay', 'true');
        
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = async () => {
          try {
            // Focus the camera if possible (helps on some devices)
            const [track] = stream.getVideoTracks();
            if (track && typeof track.getCapabilities === 'function') {
              const capabilities = track.getCapabilities() as MediaTrackCapabilities & { focusMode?: string[] };
              const focusMode = capabilities.focusMode;
              if (focusMode && Array.isArray(focusMode) && focusMode.includes('continuous')) {
                await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] } as unknown as MediaTrackConstraints);
              }
            }
            
            await videoRef.current!.play();
            
            // Start detecting barcodes
            if (hasBarcodeDetector && supportedFormats.includes('qr_code')) {
              detectBarcodes();
            } else if (isIOS) {
              // Better guidance for iOS users
              setError('此裝置無法自動掃描QR碼。請使用以下方法：\n1. 使用iOS內建相機app掃描\n2. 嘗試Safari的最新版本');
            } else {
              setError('此瀏覽器不支持條碼檢測，請嘗試使用Chrome或Edge。');
            }
          } catch (e) {
            console.error('Error playing video:', e);
            setError('播放視頻流時出錯，請重試或使用其他瀏覽器。');
          }
        };
      }
    } catch (err) {
      console.error('Error starting scanner:', err);
      
      // More specific error messages for iOS users
      if (isIOS) {
        setError('無法訪問相機。iOS用戶需要：1. 在設置>隱私中允許網站訪問相機 2. 使用iOS相機App掃描QR碼');
      } else {
        setError('啟動掃描器時出錯。請確保已授予相機權限。');
      }
      
      setScanning(false);
      if (onError) onError(err instanceof Error ? err.message : String(err));
    }
  };

  // Stop scanning function
  const stopScanner = () => {
    if (!videoRef.current?.srcObject) return;
    
    // Stop all video tracks
    const stream = videoRef.current.srcObject as MediaStream;
    stream.getTracks().forEach(track => track.stop());
    videoRef.current.srcObject = null;
    setScanning(false);
  };

  // Detect barcodes using BarcodeDetector API
  const detectBarcodes = async () => {
    if (!videoRef.current || !scanning || !('BarcodeDetector' in window)) return;
    try {
      // @ts-expect-error - BarcodeDetector may not be recognized by TypeScript
      const barcodeDetector = new BarcodeDetector({
        // Only use formats that are actually supported by the browser
        formats: supportedFormats.length > 0 ? supportedFormats : ['qr_code']
      });
      
      const detectFrame = async () => {
        if (!videoRef.current || !scanning) return;
        try {
          const barcodes = await barcodeDetector.detect(videoRef.current);
          for (const barcode of barcodes) {
            // Found a barcode
            console.log('Barcode detected:', barcode.rawValue);
            const rawValue = barcode.rawValue;
            let ticketId = rawValue;
            
            // Check if the scanned value is a URL
            if (rawValue.startsWith('http') || rawValue.includes('://')) {
              try {
                // Parse the URL
                const url = new URL(rawValue);
                
                // If it has a 'data' parameter, try to extract ticket info
                if (url.searchParams.has('data')) {
                  const data = url.searchParams.get('data');
                  try {
                    // Try to decode and parse the data parameter
                    if (data) {
                      const decodedData = JSON.parse(atob(decodeURIComponent(data))) as ParsedQRData;
                      if (decodedData && decodedData.ticketId) {
                        console.log('Extracted ticketId from URL data:', decodedData.ticketId);
                        ticketId = decodedData.ticketId;
                      }
                    }
                  } catch (e) {
                    console.error('Error parsing URL data parameter:', e);
                  }
                }
              } catch (e) {
                console.error('Error parsing scanned URL:', e);
              }
            }
            
            // Handle the scanned result with the extracted ticket ID
            if (redirectToVerify) {
              // Stop scanner before redirecting
              stopScanner();
              // Redirect to the ticket verification page with the scanned ID
              console.log('Redirecting to verify with ticket ID:', ticketId);
              router.push(`/admin/tickets/verify/${encodeURIComponent(ticketId)}`);
              return;
            } else if (onScan) {
              // Call the onScan callback with the result
              onScan(ticketId);
              // Optionally stop scanning after successful scan
              stopScanner();
              return;
            }
          }
          
          // If no barcode was found, request next frame
          if (scanning) {
            requestAnimationFrame(detectFrame);
          }
        } catch (err) {
          console.error('Error detecting barcode:', err);
          if (scanning) {
            requestAnimationFrame(detectFrame);
          }
        }
      };
      
      // Start detection loop
      detectFrame();
    } catch (err) {
      console.error('Barcode detection error:', err);
      setError('條碼檢測出錯。請嘗試更新瀏覽器或使用不同設備。');
      if (onError) onError(err instanceof Error ? err.message : String(err));
      setScanning(false);
    }
  };

  // Toggle scanning
  const toggleScanner = () => {
    if (scanning) {
      stopScanner();
    } else {
      startScanner();
    }
  };

  // Handle manual ticket ID submission
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTicketId.trim()) return;
    
    let ticketId = manualTicketId.trim();
    
    // Check if the input might be a URL
    if (ticketId.startsWith('http') || ticketId.includes('://')) {
      try {
        const url = new URL(ticketId);
        
        // If it has a 'data' parameter, extract ticket info
        if (url.searchParams.has('data')) {
          const data = url.searchParams.get('data');
          if (data) {
            try {
              const decodedData = JSON.parse(atob(decodeURIComponent(data))) as ParsedQRData;
              if (decodedData && decodedData.ticketId) {
                ticketId = decodedData.ticketId;
                console.log('Extracted ticket ID from manual URL input:', ticketId);
              }
            } catch (e) {
              console.error('Error parsing data parameter:', e);
            }
          }
        }
      } catch (e) {
        console.error('Error parsing URL:', e);
      }
    } else if (ticketId.length > 20) {
      // This could be base64 data directly from iOS camera
      try {
        const data = JSON.parse(atob(ticketId)) as ParsedQRData;
        if (data && data.ticketId) {
          ticketId = data.ticketId;
          console.log('Extracted ticket ID from base64 data:', ticketId);
        }
      } catch {
        // Not base64 data, use as-is
        console.log('Not valid base64 data, using as-is');
      }
    }
    
    if (redirectToVerify) {
      console.log('Manual redirect to verify with ticket ID:', ticketId);
      router.push(`/admin/tickets/verify/${encodeURIComponent(ticketId)}`);
    } else if (onScan) {
      onScan(ticketId);
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-full px-2 sm:px-4 md:px-0 sm:max-w-lg mx-auto">
      <div className="relative mb-3 sm:mb-4 bg-black rounded-lg overflow-hidden w-full aspect-[4/3]">
        {scanning && (
          <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black to-transparent p-2 text-white text-sm text-center font-medium">
            {isIOS ? '相機已啟動，請對準QR碼' : '使用相機掃描票券QR碼以進行檢票驗證'}
          </div>
        )}
        
        <video
          ref={videoRef}
          className={`w-full h-full object-cover ${scanning ? 'opacity-100' : 'opacity-0 h-0'}`}
          playsInline
          autoPlay
          muted
        />
        
        {scanning && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-[65%] h-[65%] sm:w-56 sm:h-56 border-2 border-white/70 rounded relative">
              {/* Scanning animation line */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500 animate-[scan_2s_ease-in-out_infinite]"></div>
              
              {/* Corner markers for easier targeting */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-green-500"></div>
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-green-500"></div>
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-green-500"></div>
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-green-500"></div>
            </div>
          </div>
        )}
        
        {!scanning && !error && (
          <div className="absolute inset-0 bg-gray-800 flex flex-col items-center justify-center text-center p-4">
            <p className="text-white mb-2">掃描票券QR碼</p>
            <p className="text-gray-300 text-sm">{isIOS ? '點擊下方按鈕啟動相機' : '點擊掃描按鈕開始'}</p>
          </div>
        )}
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 sm:px-4 sm:py-3 rounded relative mb-3 sm:mb-4 w-full">
          <span className="block text-sm whitespace-pre-line">{error}</span>
          
          {isIOS && (
            <div className="mt-2 sm:mt-3 text-xs bg-white p-2 rounded border border-gray-200">
              <p className="font-medium mb-1">iPhone/iPad用戶掃描方法:</p>
              <ol className="list-decimal pl-4 sm:pl-5 space-y-1">
                <li>使用iOS相機App直接掃描QR碼</li>
                <li>如獲得純數字（如1747419192075），請使用下方「手動輸入」</li>
                <li>或複製數字後點擊「手動輸入」按鈕</li>
              </ol>
            </div>
          )}
        </div>
      )}
      
      <div className="flex flex-col w-full space-y-2 sm:space-y-3">
        <button
          onClick={toggleScanner}
          onTouchStart={(e) => {
            if (scanning || hasCamera) {
              e.preventDefault(); // Prevents double-firing on iOS
              toggleScanner();
            }
          }}
          disabled={!hasCamera}
          className={`px-4 sm:px-6 py-3 rounded-lg font-medium text-base w-full sm:w-auto ${
            scanning
              ? 'bg-red-600 active:bg-red-800 text-white'
              : 'bg-blue-600 active:bg-blue-800 text-white'
          } ${
            !hasCamera ? 'opacity-50 cursor-not-allowed' : ''
          } touch-manipulation`}
          style={{ 
            WebkitTapHighlightColor: 'transparent',
            WebkitAppearance: 'none'
          }}
          aria-label={scanning ? '停止掃描' : '開始掃描'}
        >
          {scanning ? '停止掃描' : (isIOS ? '啟動相機' : '開始掃描')}
        </button>
        
        {isIOS && (
          <button
            onClick={() => setShowManualEntry(!showManualEntry)}
            className="px-4 sm:px-6 py-3 border border-gray-300 rounded-lg font-medium text-base w-full bg-white text-gray-700 active:bg-gray-100"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            {showManualEntry ? '隱藏手動輸入' : '手動輸入票券ID'}
          </button>
        )}
      </div>

      {showManualEntry && (
        <div className="w-full mt-4 bg-white p-4 rounded-lg border border-gray-300">
          <h3 className="text-sm font-medium mb-2">手動輸入票券ID</h3>
          <form onSubmit={handleManualSubmit} className="flex flex-col gap-2">
            <input
              type="text"
              value={manualTicketId}
              onChange={(e) => setManualTicketId(e.target.value)}
              placeholder="輸入票券ID或掃描得到的數字"
              className="w-full px-3 py-3 border rounded text-base"
            />
            <button
              type="submit"
              className="px-4 py-3 bg-green-600 text-white rounded hover:bg-green-700 active:bg-green-800 text-base font-medium"
            >
              驗證
            </button>
          </form>
          <p className="text-xs text-gray-500 mt-2">
            如果iOS相機掃描只得到數字，請在此處輸入
          </p>
        </div>
      )}
      
      <div className="mt-2 text-xs text-gray-500 text-center">
        掃描成功後將自動跳轉到票券驗證頁面
      </div>
      
      {isIOS && (
        <div className="mt-4 text-center w-full p-3 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-medium text-blue-800">iOS掃描指南</h3>
          <p className="text-sm text-blue-700 mt-1">
            使用iOS相機掃描時，請訪問本系統的網址，然後用相機掃描票券QR碼。
            掃描結果可能是數字、文字或網址，請使用「手動輸入」功能輸入這些內容。
          </p>
          <div className="flex flex-col gap-2 mt-2">
            <a 
              href={`https://support.apple.com/zh-hk/HT208843`}
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-white bg-blue-600 px-3 py-2 rounded-lg"
            >
              iOS掃描教學
            </a>
            <button
              onClick={() => {
                if (!scanning) startScanner();
                setShowManualEntry(true);
              }}
              className="text-sm bg-gray-100 border border-gray-300 px-3 py-2 rounded-lg"
            >
              切換到手動輸入
            </button>
          </div>
        </div>
      )}
      
      {!hasCamera && (
        <p className="text-sm text-gray-500 mt-2 text-center">
          未檢測到相機。請確保您的設備有攝像頭並已授權使用。
        </p>
      )}
    </div>
  );
}
