'use client';

import { useState } from 'react';

export default function TestDb() {
  const [status, setStatus] = useState('Ready');

  const addFrame = async () => {
    setStatus('Saving...');

    // CHANGE THESE THREE LINES FOR EACH FRAME YOU WANT TO ADD
    const frameData = {
      name: "Election Frame",        // 1. Change this name
      src: "/frames/election.png",   // 2. Change this to your file path
      category: "Politics"           // 3. Change the category
    };

    try {
      const response = await fetch('/api/frame', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(frameData),
      });

      if (response.ok) {
        setStatus('Success!');
        alert(`${frameData.name} added successfully!`);
        // Refresh the page to see the new frame in the sidebar
        window.location.reload(); 
      } else {
        const errorData = await response.json();
        setStatus('Error');
        alert("Failed: " + errorData.error);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setStatus('Connection Failed');
    }
  };

  return (
    <div className="p-4 border rounded-xl bg-white shadow-sm flex flex-col items-center gap-2">
      <p className="text-sm font-medium text-gray-600">Database Tool</p>
      <button 
        onClick={addFrame}
        disabled={status === 'Saving...'}
        className={`${
          status === 'Success!' ? 'bg-green-600' : 'bg-blue-600'
        } text-white px-6 py-2 rounded-lg hover:opacity-90 transition-all active:scale-95 disabled:bg-gray-400`}
      >
        {status === 'Saving...' ? 'Processing...' : 'Push Frame to MongoDB'}
      </button>
      {status === 'Success!' && (
        <p className="text-xs text-green-600 font-bold">Data Sent! Change the code to add another.</p>
      )}
    </div>
  );
}