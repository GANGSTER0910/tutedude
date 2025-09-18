import { useEffect } from "react";
import ProctorInterface from "@/components/ProctorInterface";

const Index = () => {
  useEffect(() => {
    // Update document title
    document.title = "Video Proctoring System - Interview Monitoring";
    
    // Add meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Professional video proctoring system with AI-powered focus detection, object recognition, and real-time integrity monitoring for online interviews and examinations.');
    }
  }, []);

  return <ProctorInterface />;
};

export default Index;