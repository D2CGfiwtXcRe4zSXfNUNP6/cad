document.addEventListener('DOMContentLoaded', function() {
            const canvas = document.getElementById('drawing-canvas');
            const ctx = canvas.getContext('2d');
            const tools = document.querySelectorAll('.tool');
            const cursorPosition = document.getElementById('cursor-position');
            const currentTool = document.getElementById('current-tool');
            const canvasScale = document.getElementById('canvas-scale');
            const zoomInBtn = document.getElementById('zoom-in');
            const zoomOutBtn = document.getElementById('zoom-out');
            const resetViewBtn = document.getElementById('reset-view');
            const saveBtn = document.getElementById('save-btn');
            const clearBtn = document.getElementById('clear-btn');
            const undoBtn = document.getElementById('undo-btn');
            const redoBtn = document.getElementById('redo-btn');
            const textInputContainer = document.getElementById('text-input-container');
            const textInput = document.getElementById('text-input');
            const addTextBtn = document.getElementById('add-text-btn');
            const selectionBox = document.getElementById('selection-box');
            const rotationHandle = document.getElementById('rotation-handle');
            const moveHandle = document.getElementById('move-handle');
            const rotationInput = document.getElementById('rotation');
            const showLabelsCheckbox = document.getElementById('show-labels');
            
            // Canvas setup
            let scale = 1;
            let offsetX = 0;
            let offsetY = 0;
            let isDrawing = false;
            let isMoving = false;
            let isRotating = false;
            let lastX = 0;
            let lastY = 0;
            let selectedTool = 'select';
            let currentShape = null;
            let shapes = [];
            let history = [];
            let historyIndex = -1;
            let selectedShape = null;
            let textPosition = { x: 0, y: 0 };
            let moveOffset = { x: 0, y: 0 };
            let showLabels = true;
            
            // Initialize canvas size
            function initCanvas() {
                const container = document.querySelector('.canvas-container');
                canvas.width = container.offsetWidth;
                canvas.height = container.offsetHeight;
                
                // Set a neutral background with grid pattern
                drawBackground();
                redrawShapes();
            }
            
            // Save state to history
            function saveState() {
                // Remove any future states if we're not at the end of history
                if (historyIndex < history.length - 1) {
                    history = history.slice(0, historyIndex + 1);
                }
                
                history.push(JSON.stringify(shapes));
                historyIndex = history.length - 1;
                
                updateUndoRedoButtons();
            }
            
            // Update undo/redo buttons state
            function updateUndoRedoButtons() {
                undoBtn.disabled = historyIndex <= 0;
                redoBtn.disabled = historyIndex >= history.length - 1;
            }
            
            // Undo action
            function undo() {
                if (historyIndex > 0) {
                    historyIndex--;
                    shapes = JSON.parse(history[historyIndex]);
                    redrawShapes();
                    updateUndoRedoButtons();
                }
            }
            
            // Redo action
            function redo() {
                if (historyIndex < history.length - 1) {
                    historyIndex++;
                    shapes = JSON.parse(history[historyIndex]);
                    redrawShapes();
                    updateUndoRedoButtons();
                }
            }
            
            // Draw grid background
            function drawBackground() {
                const patternSize = 20 * scale;
                const patternCanvas = document.createElement('canvas');
                const patternCtx = patternCanvas.getContext('2d');
                
                patternCanvas.width = patternSize;
                patternCanvas.height = patternSize;
                
                patternCtx.strokeStyle = '#e0e0e0';
                patternCtx.lineWidth = 1;
                patternCtx.beginPath();
                patternCtx.moveTo(0, patternSize);
                patternCtx.lineTo(patternSize, patternSize);
                patternCtx.lineTo(patternSize, 0);
                patternCtx.stroke();
                
                const bgPattern = ctx.createPattern(patternCanvas, 'repeat');
                ctx.fillStyle = bgPattern;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            
            // Redraw all shapes
            function redrawShapes() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                drawBackground();
                
                // Remove any existing labels
                document.querySelectorAll('.object-label').forEach(label => label.remove());
                
                shapes.forEach(shape => {
                    drawShape(shape);
                    
                    // Add label if enabled
                    if (showLabels) {
                        addLabelToShape(shape);
                    }
                });
                
                if (currentShape) {
                    drawShape(currentShape);
                    
                    // Add label if enabled
                    if (showLabels) {
                        addLabelToShape(currentShape);
                    }
                }
                
                // Draw selection box if a shape is selected
                if (selectedShape) {
                    const index = shapes.indexOf(selectedShape);
                    if (index !== -1) {
                        drawSelectionBox(selectedShape);
                    } else {
                        selectedShape = null;
                    }
                }
            }
            
            // Draw a single shape
            function drawShape(shape) {
                ctx.save();
                
                // Apply rotation if needed
                if (shape.rotation && shape.rotation !== 0) {
                    const centerX = shape.startX + (shape.width || 0) / 2;
                    const centerY = shape.startY + (shape.height || 0) / 2;
                    ctx.translate(centerX, centerY);
                    ctx.rotate(shape.rotation * Math.PI / 180);
                    ctx.translate(-centerX, -centerY);
                }
                
                ctx.lineWidth = shape.lineWidth;
                ctx.strokeStyle = shape.strokeStyle;
                ctx.fillStyle = shape.fillStyle;
                ctx.globalAlpha = shape.opacity;
                
                switch(shape.type) {
                    case 'wall':
                        ctx.beginPath();
                        ctx.moveTo(shape.startX, shape.startY);
                        ctx.lineTo(shape.endX, shape.endY);
                        ctx.stroke();
                        break;
                    case 'rectangle':
                        ctx.fillRect(shape.startX, shape.startY, shape.width, shape.height);
                        ctx.strokeRect(shape.startX, shape.startY, shape.width, shape.height);
                        break;
                    case 'circle':
                        const radius = Math.sqrt(Math.pow(shape.width, 2) + Math.pow(shape.height, 2));
                        ctx.beginPath();
                        ctx.arc(shape.startX + shape.width/2, shape.startY + shape.height/2, radius/2, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.stroke();
                        break;
                    case 'door':
                        drawDoor(shape);
                        break;
                    case 'window':
                        drawWindow(shape);
                        break;
                    case 'text':
                        drawText(shape);
                        break;
                }
                
                ctx.restore();
            }
            
            // Add label to a shape
           // Add label to a shape
function addLabelToShape(shape) {
    // Don't add labels to text objects
    if (shape.type === 'text') {
        return;
    }

    let labelText = '';
    let centerX, centerY;

    switch(shape.type) {
        case 'wall':
            labelText = 'Wall';
            centerX = (shape.startX + shape.endX) / 2;
            centerY = (shape.startY + shape.endY) / 2;
            break;
        case 'rectangle':
            labelText = 'Rectangle';
            centerX = shape.startX + shape.width / 2;
            centerY = shape.startY + shape.height / 2;
            break;
        case 'circle':
            labelText = 'Circle';
            centerX = shape.startX + shape.width / 2;
            centerY = shape.startY + shape.height / 2;
            break;
        case 'door':
            labelText = 'Door';
            centerX = shape.startX + shape.width / 2;
            centerY = shape.startY + shape.height / 2;
            break;
        case 'window':
            labelText = 'Window';
            centerX = shape.startX + shape.width / 2;
            centerY = shape.startY + shape.height / 2;
            break;
        default:
            return;
    }

    // Create and position the label
    const label = document.createElement('div');
    label.className = 'object-label';
    label.textContent = labelText;
    label.style.left = `${centerX + offsetX}px`;
    label.style.top = `${centerY + offsetY}px`;

    document.querySelector('.canvas-container').appendChild(label);
}

            
            // Draw a door symbol
function drawDoor(shape) {
    const width = shape.width;
    const height = shape.height;

    // Hinge point (door pivot)
    const hingeX = shape.startX;
    const hingeY = shape.startY;

    // Door leaf (panel)
    ctx.beginPath();
    ctx.moveTo(hingeX, hingeY);
    ctx.lineTo(hingeX + width, hingeY);
    ctx.strokeStyle = "#654321"; // brownish door panel
    ctx.lineWidth = 2;
    ctx.stroke();

    // Swing arc (door opening path)
    ctx.beginPath();
    ctx.arc(hingeX, hingeY, Math.abs(width), 0, Math.PI / 2, false);
    ctx.strokeStyle = "black";
    ctx.setLineDash([5, 3]); // dashed for arc
    ctx.stroke();
    ctx.setLineDash([]); // reset dash

    // Optional: door thickness (rectangle panel)
    ctx.beginPath();
    ctx.rect(hingeX, hingeY - height / 8, width, height / 4);
    ctx.strokeStyle = "#654321";
    ctx.lineWidth = 2;
    ctx.stroke();
}

            
// Draw a window symbol (AutoCAD style)
function drawWindow(shape) {
    const width = shape.width;
    const height = shape.height;

    // Window outer frame
    ctx.beginPath();
    ctx.rect(shape.startX, shape.startY, width, height);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Glass lines (double parallel lines inside the frame)
    const inset = Math.min(Math.abs(height), Math.abs(width)) * 0.25;

    if (Math.abs(width) > Math.abs(height)) {
        // Horizontal window
        ctx.beginPath();
        ctx.moveTo(shape.startX, shape.startY + inset);
        ctx.lineTo(shape.startX + width, shape.startY + inset);
        ctx.moveTo(shape.startX, shape.startY + height - inset);
        ctx.lineTo(shape.startX + width, shape.startY + height - inset);
        ctx.stroke();
    } else {
        // Vertical window
        ctx.beginPath();
        ctx.moveTo(shape.startX + inset, shape.startY);
        ctx.lineTo(shape.startX + inset, shape.startY + height);
        ctx.moveTo(shape.startX + width - inset, shape.startY);
        ctx.lineTo(shape.startX + width - inset, shape.startY + height);
        ctx.stroke();
    }

    // Optional: center glass line
    ctx.beginPath();
    if (Math.abs(width) > Math.abs(height)) {
        ctx.moveTo(shape.startX, shape.startY + height / 2);
        ctx.lineTo(shape.startX + width, shape.startY + height / 2);
    } else {
        ctx.moveTo(shape.startX + width / 2, shape.startY);
        ctx.lineTo(shape.startX + width / 2, shape.startY + height);
    }
    ctx.setLineDash([4, 3]); // dashed to show glass
    ctx.strokeStyle = "#00aaff";
    ctx.stroke();
    ctx.setLineDash([]);
}

            // Draw text
            function drawText(shape) {
                ctx.font = `${shape.fontSize}px Arial`;
                ctx.fillStyle = shape.strokeStyle;
                ctx.fillText(shape.text, shape.startX, shape.startY);
            }
            
            // Draw selection box around a shape
            function drawSelectionBox(shape) {
                const padding = 5;
                let x, y, width, height;
                
                if (shape.type === 'wall') {
                    x = Math.min(shape.startX, shape.endX) - padding;
                    y = Math.min(shape.startY, shape.endY) - padding;
                    width = Math.abs(shape.endX - shape.startX) + padding * 2;
                    height = Math.abs(shape.endY - shape.startY) + padding * 2;
                } else {
                    x = shape.startX - padding;
                    y = shape.startY - padding;
                    width = (shape.width || 0) + padding * 2;
                    height = (shape.height || 0) + padding * 2;
                }
                
                selectionBox.style.display = 'block';
                selectionBox.style.left = `${x + offsetX}px`;
                selectionBox.style.top = `${y + offsetY}px`;
                selectionBox.style.width = `${width}px`;
                selectionBox.style.height = `${height}px`;
                
                // Position rotation handle
                rotationHandle.style.display = 'block';
                rotationHandle.style.left = `${x + width/2 + offsetX}px`;
                rotationHandle.style.top = `${y - 20 + offsetY}px`;
                
                // Position move handle
                moveHandle.style.display = 'block';
                moveHandle.style.left = `${x + width/2 + offsetX}px`;
                moveHandle.style.top = `${y + height + 10 + offsetY}px`;
            }
            
            // Check if a point is inside a shape
            function isPointInShape(x, y, shape) {
                switch(shape.type) {
                    case 'wall':
                        // Simplified point-line distance check
                        const dx = shape.endX - shape.startX;
                        const dy = shape.endY - shape.startY;
                        const length = Math.sqrt(dx * dx + dy * dy);
                        const distance = Math.abs((dy * x - dx * y + shape.endX * shape.startY - shape.endY * shape.startX) / length);
                        return distance < 5; // 5px threshold
                    
                    case 'rectangle':
                        return x >= shape.startX && x <= shape.startX + shape.width &&
                               y >= shape.startY && y <= shape.startY + shape.height;
                    
                    case 'circle':
                        const centerX = shape.startX + shape.width/2;
                        const centerY = shape.startY + shape.height/2;
                        const radius = Math.sqrt(Math.pow(shape.width, 2) + Math.pow(shape.height, 2)) / 2;
                        return Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)) <= radius;
                    
                    case 'door':
                    case 'window':
                        return x >= shape.startX && x <= shape.startX + shape.width &&
                               y >= shape.startY && y <= shape.startY + shape.height;
                    
                    case 'text':
                        // Approximate text bounding box
                        ctx.font = `${shape.fontSize}px Arial`;
                        const textWidth = ctx.measureText(shape.text).width;
                        return x >= shape.startX && x <= shape.startX + textWidth &&
                               y <= shape.startY && y >= shape.startY - shape.fontSize;
                    
                    default:
                        return false;
                }
            }
            
            // Tool selection
            tools.forEach(tool => {
                tool.addEventListener('click', () => {
                    tools.forEach(t => t.classList.remove('active'));
                    tool.classList.add('active');
                    selectedTool = tool.dataset.tool;
                    currentTool.textContent = `Current Tool: ${selectedTool.charAt(0).toUpperCase() + selectedTool.slice(1)}`;
                    
                    // Clear selection when switching tools
                    if (selectedTool !== 'select') {
                        selectedShape = null;
                        selectionBox.style.display = 'none';
                        rotationHandle.style.display = 'none';
                        moveHandle.style.display = 'none';
                    }
                    
                    // Change cursor based on tool
                    switch(selectedTool) {
                        case 'select':
                            canvas.style.cursor = 'default';
                            break;
                        case 'wall':
                        case 'rectangle':
                        case 'circle':
                        case 'door':
                        case 'window':
                            canvas.style.cursor = 'crosshair';
                            break;
                        case 'erase':
                            canvas.style.cursor = 'not-allowed';
                            break;
                        case 'text':
                            canvas.style.cursor = 'text';
                            break;
                        default:
                            canvas.style.cursor = 'pointer';
                    }
                });
            });
            
            // Show labels checkbox
            showLabelsCheckbox.addEventListener('change', function() {
                showLabels = this.checked;
                redrawShapes();
            });
            
            // Mouse events
            canvas.addEventListener('mousedown', startDrawing);
            canvas.addEventListener('mousemove', draw);
            canvas.addEventListener('mouseup', stopDrawing);
            canvas.addEventListener('mouseout', stopDrawing);
            
            // Rotation and move handle events
            rotationHandle.addEventListener('mousedown', startRotating);
            moveHandle.addEventListener('mousedown', startMoving);
            
            // Touch events for iPad
            canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
            canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
            canvas.addEventListener('touchend', handleTouchEnd);
            
            function handleTouchStart(e) {
                e.preventDefault();
                const touch = e.touches[0];
                const mouseEvent = new MouseEvent('mousedown', {
                    clientX: touch.clientX,
                    clientY: touch.clientY
                });
                canvas.dispatchEvent(mouseEvent);
            }
            
            function handleTouchMove(e) {
                e.preventDefault();
                const touch = e.touches[0];
                const mouseEvent = new MouseEvent('mousemove', {
                    clientX: touch.clientX,
                    clientY: touch.clientY
                });
                canvas.dispatchEvent(mouseEvent);
            }
            
            function handleTouchEnd(e) {
                e.preventDefault();
                const mouseEvent = new MouseEvent('mouseup', {});
                canvas.dispatchEvent(mouseEvent);
            }
            
            function startDrawing(e) {
                isDrawing = true;
                
                // Get current mouse position relative to canvas
                const rect = canvas.getBoundingClientRect();
                lastX = (e.clientX - rect.left - offsetX) / scale;
                lastY = (e.clientY - rect.top - offsetY) / scale;
                
                if (selectedTool === 'text') {
                    textPosition = { x: lastX, y: lastY };
                    textInputContainer.style.display = 'flex';
                    textInputContainer.style.left = `${e.clientX}px`;
                    textInputContainer.style.top = `${e.clientY}px`;
                    textInput.focus();
                    isDrawing = false;
                    return;
                }
                
                if (selectedTool === 'select') {
                    // Check if we're clicking on a shape
                    selectedShape = null;
                    selectionBox.style.display = 'none';
                    rotationHandle.style.display = 'none';
                    moveHandle.style.display = 'none';
                    
                    for (let i = shapes.length - 1; i >= 0; i--) {
                        if (isPointInShape(lastX, lastY, shapes[i])) {
                            selectedShape = shapes[i];
                            drawSelectionBox(selectedShape);
                            rotationInput.value = selectedShape.rotation || 0;
                            
                            // Calculate offset for moving
                            if (selectedShape.type === 'wall') {
                                moveOffset.x = lastX - selectedShape.startX;
                                moveOffset.y = lastY - selectedShape.startY;
                            } else {
                                moveOffset.x = lastX - selectedShape.startX;
                                moveOffset.y = lastY - selectedShape.startY;
                            }
                            break;
                        }
                    }
                    
                    // If we clicked on a shape, start moving it
                    if (selectedShape) {
                        isMoving = true;
                    }
                    
                    isDrawing = false;
                    return;
                }
                
                if (selectedTool === 'erase') {
                    // Erase shape under cursor
                    for (let i = shapes.length - 1; i >= 0; i--) {
                        if (isPointInShape(lastX, lastY, shapes[i])) {
                            saveState();
                            shapes.splice(i, 1);
                            redrawShapes();
                            break;
                        }
                    }
                    isDrawing = false;
                    return;
                }
                
                if (selectedTool !== 'select') {
                    saveState();
                    currentShape = {
                        type: selectedTool,
                        startX: lastX,
                        startY: lastY,
                        endX: lastX,
                        endY: lastY,
                        width: 0,
                        height: 0,
                        lineWidth: document.getElementById('line-width').value,
                        strokeStyle: document.getElementById('line-color').value,
                        fillStyle: document.getElementById('fill-color').value,
                        opacity: document.getElementById('opacity').value / 100,
                        rotation: 0
                    };
                }
            }
            
            function draw(e) {
                if (!isDrawing && !isMoving && !isRotating) {
                    // Update cursor position
                    const rect = canvas.getBoundingClientRect();
                    const x = (e.clientX - rect.left - offsetX) / scale;
                    const y = (e.clientY - rect.top - offsetY) / scale;
                    cursorPosition.textContent = `X: ${Math.round(x)}, Y: ${Math.round(y)}`;
                    return;
                }
                
                const rect = canvas.getBoundingClientRect();
                const currentX = (e.clientX - rect.left - offsetX) / scale;
                const currentY = (e.clientY - rect.top - offsetY) / scale;
                
                cursorPosition.textContent = `X: ${Math.round(currentX)}, Y: ${Math.round(currentY)}`;
                
                if (isMoving && selectedShape) {
                    // Move the selected shape
                    const deltaX = currentX - lastX;
                    const deltaY = currentY - lastY;
                    
                    if (selectedShape.type === 'wall') {
                        selectedShape.startX += deltaX;
                        selectedShape.startY += deltaY;
                        selectedShape.endX += deltaX;
                        selectedShape.endY += deltaY;
                    } else {
                        selectedShape.startX += deltaX;
                        selectedShape.startY += deltaY;
                        
                        // For shapes with width/height, we need to update end positions too
                        if (selectedShape.endX !== undefined) {
                            selectedShape.endX += deltaX;
                            selectedShape.endY += deltaY;
                        }
                    }
                    
                    lastX = currentX;
                    lastY = currentY;
                    
                    drawSelectionBox(selectedShape);
                    redrawShapes();
                    return;
                }
                
                if (currentShape) {
                    currentShape.endX = currentX;
                    currentShape.endY = currentY;
                    currentShape.width = currentX - currentShape.startX;
                    currentShape.height = currentY - currentShape.startY;
                    
                    redrawShapes();
                }
            }
            
            function stopDrawing() {
                if (isDrawing && currentShape) {
                    shapes.push({...currentShape});
                    currentShape = null;
                    redrawShapes();
                }
                
                if (isMoving) {
                    saveState();
                    isMoving = false;
                }
                
                isDrawing = false;
            }
            
            function startRotating(e) {
                e.stopPropagation();
                isRotating = true;
                const rect = canvas.getBoundingClientRect();
                lastX = (e.clientX - rect.left - offsetX) / scale;
                lastY = (e.clientY - rect.top - offsetY) / scale;
                
                document.addEventListener('mousemove', rotateShape);
                document.addEventListener('mouseup', stopRotating);
            }
            
            function rotateShape(e) {
                if (!isRotating || !selectedShape) return;
                
                const rect = canvas.getBoundingClientRect();
                const currentX = (e.clientX - rect.left - offsetX) / scale;
                const currentY = (e.clientY - rect.top - offsetY) / scale;
                
                const centerX = selectedShape.startX + (selectedShape.width || 0) / 2;
                const centerY = selectedShape.startY + (selectedShape.height || 0) / 2;
                
                const prevAngle = Math.atan2(lastY - centerY, lastX - centerX);
                const newAngle = Math.atan2(currentY - centerY, currentX - centerX);
                
                const rotationDelta = (newAngle - prevAngle) * 180 / Math.PI;
                
                selectedShape.rotation = (selectedShape.rotation || 0) + rotationDelta;
                rotationInput.value = selectedShape.rotation;
                
                lastX = currentX;
                lastY = currentY;
                
                redrawShapes();
            }
            
            function stopRotating() {
                isRotating = false;
                saveState();
                document.removeEventListener('mousemove', rotateShape);
                document.removeEventListener('mouseup', stopRotating);
            }
            
            function startMoving(e) {
                e.stopPropagation();
                isMoving = true;
                const rect = canvas.getBoundingClientRect();
                lastX = (e.clientX - rect.left - offsetX) / scale;
                lastY = (e.clientY - rect.top - offsetY) / scale;
                
                document.addEventListener('mousemove', draw);
                document.addEventListener('mouseup', stopMoving);
            }
            
            function stopMoving() {
                isMoving = false;
                saveState();
                document.removeEventListener('mousemove', draw);
                document.removeEventListener('mouseup', stopMoving);
            }
            
            // Add text functionality
            addTextBtn.addEventListener('click', function() {
                if (textInput.value.trim() !== '') {
                    saveState();
                    shapes.push({
                        type: 'text',
                        text: textInput.value,
                        startX: textPosition.x,
                        startY: textPosition.y,
                        strokeStyle: document.getElementById('line-color').value,
                        fontSize: document.getElementById('font-size').value
                    });
                    
                    textInput.value = '';
                    textInputContainer.style.display = 'none';
                    redrawShapes();
                }
            });
            
            // Rotation input change
            rotationInput.addEventListener('input', function() {
                if (selectedShape) {
                    selectedShape.rotation = parseInt(this.value);
                    redrawShapes();
                }
            });
            
            // Property changes
            document.getElementById('line-width').addEventListener('input', function() {
                if (selectedShape) {
                    selectedShape.lineWidth = this.value;
                    redrawShapes();
                }
            });
            
            document.getElementById('line-color').addEventListener('input', function() {
                if (selectedShape) {
                    selectedShape.strokeStyle = this.value;
                    redrawShapes();
                }
            });
            
            document.getElementById('fill-color').addEventListener('input', function() {
                if (selectedShape) {
                    selectedShape.fillStyle = this.value;
                    redrawShapes();
                }
            });
            
            document.getElementById('opacity').addEventListener('input', function() {
                if (selectedShape) {
                    selectedShape.opacity = this.value / 100;
                    redrawShapes();
                }
            });
            
            // Zoom controls
            zoomInBtn.addEventListener('click', () => {
                scale *= 1.1;
                canvasScale.textContent = `Scale: ${Math.round(scale * 100)}%`;
                redrawShapes();
            });
            
            zoomOutBtn.addEventListener('click', () => {
                scale /= 1.1;
                canvasScale.textContent = `Scale: ${Math.round(scale * 100)}%`;
                redrawShapes();
            });
            
            resetViewBtn.addEventListener('click', () => {
                scale = 1;
                offsetX = 0;
                offsetY = 0;
                canvasScale.textContent = `Scale: ${Math.round(scale * 100)}%`;
                redrawShapes();
            });
            
            // Save and clear
            saveBtn.addEventListener('click', () => {
                const dataURL = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.download = 'floor-plan.png';
                link.href = dataURL;
                link.click();
            });
            
            clearBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to clear the canvas?')) {
                    saveState();
                    shapes = [];
                    redrawShapes();
                }
            });
            
            // Undo/redo
            undoBtn.addEventListener('click', undo);
            redoBtn.addEventListener('click', redo);
            
            // Initialize the app
            initCanvas();
            window.addEventListener('resize', initCanvas);
            
            // Add initial state to history
            saveState();
        });