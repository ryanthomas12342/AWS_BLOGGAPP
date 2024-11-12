import React, { useEffect } from "react";

const KommunicateChat = () => {
  useEffect(() => {
    // Check if Kommunicate is already loaded
    if (window.kommunicate) {
      console.log("Kommunicate already loaded");
      return;
    }

    // Check if the script is already being loaded
    if (document.getElementById("kommunicate-script")) {
      console.log("Kommunicate script is already being loaded");
      return;
    }

    const kommunicateSettings = {
      appId: process.env.REACT_APP_BOT_ID, // Your Kommunicate App ID
      popupWidget: true,
      automaticChatOpenOnNavigation: false,
      onInit: function () {
        console.log("Kommunicate widget initialized");
      },
    };

    // Create the script element to load the Kommunicate SDK
    const script = document.createElement("script");
    script.id = "kommunicate-script";
    script.type = "text/javascript";
    script.async = true;
    script.src = "https://widget.kommunicate.io/v2/kommunicate.app";

    // On script load, initialize the Kommunicate widget
    script.onload = () => {
      if (window.kommunicate) {
        window.kommunicate.init(kommunicateSettings); // Initialize Kommunicate widget after the script is loaded
      } else {
        console.error("Kommunicate SDK failed to load.");
      }
    };

    // Append the script to the document head
    document.head.appendChild(script);

    // Cleanup function to remove the script when the component unmounts
    return () => {
      const scriptElement = document.getElementById("kommunicate-script");
      if (scriptElement) {
        scriptElement.remove();
      }
    };
  }, []); // Empty dependency array ensures the effect runs once when the component mounts

  return null; // This component doesn't render anything
};

export default KommunicateChat;
