/* global cv */

import React from 'react';
import './App.css';
import OpenCVVideo from './components/OpenCVVideo';

function App() {
  return (
    <div className="App">
      <h1>OpenCV.js Video Processing</h1>
      <OpenCVVideo />
    </div>
  );
}

export default App;
