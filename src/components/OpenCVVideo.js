// src/components/OpenCVVideo.js
/* global cv */
import React, { useState, useRef, useEffect } from 'react';
import * as fabric from 'fabric';

const OpenCVVideo = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [canvas, setCanvas] = useState(null);
  const [text, setText] = useState("");
  const [selectedFont, setSelectedFont] = useState("Arial");
  const [selectedColor, setSelectedColor] = useState("#000000");
  const [selectedObject, setSelectedObject] = useState(null);

  useEffect(() => {
    if (!window.cv || !videoRef.current || !canvasRef.current) {
      console.error('OpenCV is not loaded or video/canvas references are missing.');
      return;
    }  

    const Canvas = new fabric.Canvas(canvasRef.current, {
      width: 960,
      height: 540,
    });

    Canvas.on("selection:created", (e) => {
      setSelectedObject(e.selected[0]);
    });

    Canvas.on("selection:cleared", () => {
      setSelectedObject(null);
    });

    setCanvas(Canvas);

    const processVideo = () => {
      if (!window.cv) {
        console.log("Waiting for OpenCV.js to load...");
        setTimeout(processVideo, 100);
        return;
      }

      const video = videoRef.current;
      const canvasElement = canvasRef.current;
      const context = canvasElement.getContext("2d");

      video.addEventListener("play", () => {
        const cap = new cv.VideoCapture(video);
        const frame = new cv.Mat(video.height, video.width, cv.CV_8UC4);
        const hsv = new cv.Mat();
        const mask = new cv.Mat();
        const blurred = new cv.Mat();
        const contours = new cv.MatVector();
        const hierarchy = new cv.Mat();
        const lowerWhite = new cv.Mat(
          video.height,
          video.width,
          cv.CV_8UC3,
          [0, 0, 200, 0]
        );
        const upperWhite = new cv.Mat(
          video.height,
          video.width,
          cv.CV_8UC3,
          [180, 55, 255, 255]
        );

        const FPS = 30;

        function processFrame() {
          if (video.paused || video.ended) {
            frame.delete();
            hsv.delete();
            mask.delete();
            blurred.delete();
            contours.delete();
            hierarchy.delete();
            lowerWhite.delete();
            upperWhite.delete();
            return;
          }

          cap.read(frame);
          cv.cvtColor(frame, hsv, cv.COLOR_BGR2HSV);
          cv.GaussianBlur(hsv, blurred, new cv.Size(5, 5), 0);
          cv.inRange(blurred, lowerWhite, upperWhite, mask);
          const edges = new cv.Mat();
          cv.Canny(mask, edges, 50, 150);
          cv.findContours(edges, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE);

          // Clear the canvas before drawing new frame
          context.clearRect(0, 0, canvasElement.width, canvasElement.height);

          for (let i = 0; i < contours.size(); i++) {
            const cnt = contours.get(i);
            const rect = cv.boundingRect(cnt);
            const area = cv.contourArea(cnt);

            if (area > 1000) {
              const approx = new cv.Mat();
              cv.approxPolyDP(cnt, approx, 0.02 * cv.arcLength(cnt, true), true);

              cv.rectangle(
                frame,
                new cv.Point(rect.x, rect.y),
                new cv.Point(rect.x + rect.width, rect.y + rect.height),
                [255, 0, 0, 255],
                2
              );

              approx.delete();
            }
          }

          cv.imshow(canvasElement, frame);

          edges.delete();  // Release the edge matrix
          setTimeout(processFrame, 1000 / FPS);
        }

        // Start processing frames
        processFrame();
      });
    };

    processVideo();

    return () => {
      Canvas.dispose();
    };

  }, [text]);

  const addText = () => {
    if (canvas && text) {
      const textObject = new fabric.Text(text, {
        left: 100,
        top: 100,
        fontFamily: selectedFont,
        fontSize: 20,
        fill: selectedColor,
      });

      canvas.add(textObject);
      canvas.renderAll();
      setText("");
    }
  };

  const removeElement = () => {
    if (canvas && selectedObject) {
      canvas.remove(selectedObject);
      setSelectedObject(null);
      canvas.renderAll();
    }
  };

  const handleImageUpload = (e) => {
    if (canvas) {
      let file = e.target.files[0];
      let fileType = file.type;

      if (fileType.startsWith("image/")) {
        let reader = new FileReader();
        reader.onload = (event) => {
          let imageUrl = event.target.result;
          let imageElement = document.createElement("img");
          imageElement.src = imageUrl;

          imageElement.onload = function () {
            let image = new fabric.Image(imageElement);
            image.set({
              left: 50,
              top: 50,
              scaleX: 0.5,
              scaleY: 0.5,
            });
            canvas.add(image);
            canvas.centerObject(image);
            canvas.setActiveObject(image);
            canvas.renderAll();
          };
        };

        reader.onerror = (error) => {
          console.error("Error reading file:", error);
        };

        reader.readAsDataURL(file);
      } else if (fileType.startsWith("video/")) {
        let videoElement = document.createElement("video");
        videoElement.src = URL.createObjectURL(file);
        videoElement.controls = true;
        videoElement.autoplay = true;
        videoElement.loop = true;
        videoElement.width = 960;
        videoElement.height = 540;

        let videoFabricImage = new fabric.Image(videoElement, {
          left: 0,
          top: 0,
          scaleX: canvas.width / videoElement.width,
          scaleY: canvas.height / videoElement.height,
          selectable: true,
        });

        canvas.add(videoFabricImage);
        videoElement.addEventListener("play", () => {
          const updateVideoFrame = () => {
            if (!videoElement.paused && !videoElement.ended) {
              canvas.getContext("2d").drawImage(videoElement, 0, 0, canvas.width, canvas.height);
              canvas.renderAll();
              requestAnimationFrame(updateVideoFrame);
            }
          };
          updateVideoFrame();
        });

        canvas.centerObject(videoFabricImage);
        canvas.setActiveObject(videoFabricImage);
        canvas.renderAll();
      } else {
        console.error("Unsupported file type.");
      }
    } else {
      console.error("Canvas not initialized.");
    }
  };

  return (
    <div className="OpenCVVideo items-center justify-center">
      <video
        ref={videoRef}
        width="960"
        height="540"
        autoPlay
        muted
        loop
        className="background-video"
      >
        <source src="/imgs/template-trial.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <canvas
        className="canvas"
        ref={canvasRef}
        width="960"
        height="540"
      />
      <div className="controls">
        <div className="flex items-center justify-center mt-4">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter text"
            className="border rounded-md px-2 py-1"
          />
          <select
            value={selectedFont}
            onChange={(e) => setSelectedFont(e.target.value)}
            className="ml-2 border rounded-md px-2 py-1"
          >
            <option value="Arial">Arial</option>
            <option value="Courier New">Courier New</option>
            <option value="Georgia">Georgia</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Verdana">Verdana</option>
          </select>
          <div className="flex items-center ml-2 border rounded-md px-2 py-1">
            <label htmlFor="color-picker" className="mr-2">Color:</label>
            <input
              id="color-picker"
              type="color"
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
            />
          </div>
          <button onClick={addText} className="ml-2 border rounded-md px-2 py-1">
            Add Text
          </button>
          <button onClick={removeElement} className="ml-2 border rounded-md px-2 py-1">
            Remove Selected
          </button>
        </div>
        <input
          type="file"
          accept="image/*,video/*"
          onChange={handleImageUpload}
          className="mt-4"
        />
      </div>
    </div>
  );
};

export default OpenCVVideo;