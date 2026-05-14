import React, { useRef, useState, useEffect, useCallback } from 'react';
import './SignaturePad.css';

/**
 * SignaturePad – A reusable digital signature canvas component.
 *
 * Props:
 *  - onSignatureChange(blob, dataUrl)  – fired whenever the signature changes
 *  - label          – label text (default: "Officer Signature")
 *  - required       – show required asterisk (default: true)
 *  - width          – canvas CSS width (default: '100%')
 *  - height         – canvas height in px (default: 160)
 *  - initialImage   – optional data-url or image url to pre-fill the canvas
 */
const SignaturePad = ({
    onSignatureChange,
    label = 'Officer Signature',
    required = true,
    width = '100%',
    height = 160,
    initialImage = null
}) => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);
    const [penColor, setPenColor] = useState('#1a237e');
    const [penWidth, setPenWidth] = useState(2.5);
    const [strokes, setStrokes] = useState([]); // for undo
    const [currentStroke, setCurrentStroke] = useState([]);

    const COLORS = [
        { value: '#1a237e', label: 'Navy' },
        { value: '#000000', label: 'Black' },
        { value: '#1565c0', label: 'Blue' },
        { value: '#2e7d32', label: 'Green' }
    ];

    const THICKNESSES = [
        { value: 1.5, size: 4 },
        { value: 2.5, size: 6 },
        { value: 4, size: 9 }
    ];

    // Initialize canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();

        // Set device pixel ratio for sharp lines
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, rect.width, height);

        // If there's an initial image, draw it
        if (initialImage) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                ctx.drawImage(img, 0, 0, rect.width, height);
                setHasSignature(true);
            };
            img.src = initialImage;
        }
    }, [height, initialImage]);

    // Resize observer
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const observer = new ResizeObserver(() => {
            // Save current image
            const imageData = canvas.toDataURL();
            const ctx = canvas.getContext('2d');
            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;

            canvas.width = rect.width * dpr;
            canvas.height = height * dpr;
            ctx.scale(dpr, dpr);

            // Restore image
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0, rect.width, height);
            };
            img.src = imageData;
        });

        observer.observe(canvas.parentElement);
        return () => observer.disconnect();
    }, [height]);

    const getCoordinates = useCallback((e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();

        if (e.touches) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        }
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }, []);

    const startDrawing = useCallback((e) => {
        e.preventDefault();
        const coords = getCoordinates(e);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        ctx.beginPath();
        ctx.moveTo(coords.x, coords.y);
        ctx.strokeStyle = penColor;
        ctx.lineWidth = penWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        setIsDrawing(true);
        setCurrentStroke([coords]);
    }, [getCoordinates, penColor, penWidth]);

    const draw = useCallback((e) => {
        if (!isDrawing) return;
        e.preventDefault();

        const coords = getCoordinates(e);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();

        setCurrentStroke(prev => [...prev, coords]);
    }, [isDrawing, getCoordinates]);

    const endDrawing = useCallback(() => {
        if (!isDrawing) return;
        setIsDrawing(false);

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.closePath();

        if (currentStroke.length > 1) {
            setStrokes(prev => [...prev, {
                points: currentStroke,
                color: penColor,
                width: penWidth
            }]);
            setHasSignature(true);
            setCurrentStroke([]);

            // Notify parent with the signature data
            emitSignature();
        }
    }, [isDrawing, currentStroke, penColor, penWidth]);

    const emitSignature = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const dataUrl = canvas.toDataURL('image/png');

        // Convert to blob for FormData
        canvas.toBlob((blob) => {
            if (onSignatureChange) {
                onSignatureChange(blob, dataUrl);
            }
        }, 'image/png');
    }, [onSignatureChange]);

    const clearCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, rect.width, height);

        setStrokes([]);
        setCurrentStroke([]);
        setHasSignature(false);

        if (onSignatureChange) {
            onSignatureChange(null, null);
        }
    }, [height, onSignatureChange]);

    const undoLastStroke = useCallback(() => {
        if (strokes.length === 0) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();

        // Clear canvas
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, rect.width, height);

        // Redraw all strokes except the last
        const remaining = strokes.slice(0, -1);
        remaining.forEach(stroke => {
            ctx.beginPath();
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.width;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            stroke.points.forEach((pt, i) => {
                if (i === 0) ctx.moveTo(pt.x, pt.y);
                else ctx.lineTo(pt.x, pt.y);
            });
            ctx.stroke();
            ctx.closePath();
        });

        setStrokes(remaining);
        if (remaining.length === 0) {
            setHasSignature(false);
            if (onSignatureChange) onSignatureChange(null, null);
        } else {
            emitSignature();
        }
    }, [strokes, height, onSignatureChange, emitSignature]);

    // Attach event listeners
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleStart = (e) => startDrawing(e);
        const handleMove = (e) => draw(e);
        const handleEnd = () => endDrawing();

        canvas.addEventListener('mousedown', handleStart);
        canvas.addEventListener('mousemove', handleMove);
        canvas.addEventListener('mouseup', handleEnd);
        canvas.addEventListener('mouseleave', handleEnd);

        canvas.addEventListener('touchstart', handleStart, { passive: false });
        canvas.addEventListener('touchmove', handleMove, { passive: false });
        canvas.addEventListener('touchend', handleEnd);

        return () => {
            canvas.removeEventListener('mousedown', handleStart);
            canvas.removeEventListener('mousemove', handleMove);
            canvas.removeEventListener('mouseup', handleEnd);
            canvas.removeEventListener('mouseleave', handleEnd);

            canvas.removeEventListener('touchstart', handleStart);
            canvas.removeEventListener('touchmove', handleMove);
            canvas.removeEventListener('touchend', handleEnd);
        };
    }, [startDrawing, draw, endDrawing]);

    return (
        <div className={`signature-pad-container ${hasSignature ? 'has-signature' : ''}`}>
            {/* Header */}
            <div className="signature-pad-header">
                <span className="signature-pad-label">
                    <span className="label-icon">✍️</span>
                    {label}
                    {required && <span className="required">*</span>}
                </span>
                <span className="signature-pad-hint">Draw your signature below</span>
            </div>

            {/* Canvas */}
            <div className={`signature-canvas-wrapper ${isDrawing ? 'drawing' : ''}`}>
                <canvas
                    ref={canvasRef}
                    style={{ width, height: `${height}px` }}
                />
                {!hasSignature && (
                    <div className={`signature-placeholder ${isDrawing ? 'hidden' : ''}`}>
                        <span className="placeholder-icon">🖊️</span>
                        <span className="placeholder-text">Sign here</span>
                        <span className="placeholder-sub">Use mouse or touch to draw</span>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="signature-pad-actions">
                <button
                    type="button"
                    className="sig-btn clear"
                    onClick={clearCanvas}
                    disabled={!hasSignature}
                >
                    🗑️ Clear
                </button>
                <button
                    type="button"
                    className="sig-btn undo"
                    onClick={undoLastStroke}
                    disabled={strokes.length === 0}
                >
                    ↩️ Undo
                </button>
            </div>

            {/* Options: Color & Thickness */}
            <div className="signature-options">
                <div className="option-group">
                    <span className="option-label">Color</span>
                    {COLORS.map(c => (
                        <div
                            key={c.value}
                            className={`color-swatch ${penColor === c.value ? 'active' : ''}`}
                            style={{ backgroundColor: c.value }}
                            onClick={() => setPenColor(c.value)}
                            title={c.label}
                        />
                    ))}
                </div>
                <div className="option-group">
                    <span className="option-label">Size</span>
                    {THICKNESSES.map(t => (
                        <button
                            key={t.value}
                            type="button"
                            className={`thickness-btn ${penWidth === t.value ? 'active' : ''}`}
                            onClick={() => setPenWidth(t.value)}
                        >
                            <span
                                className="thickness-dot"
                                style={{ width: t.size, height: t.size }}
                            />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SignaturePad;
