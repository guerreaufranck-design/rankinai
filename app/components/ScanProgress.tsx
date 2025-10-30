import { useState, useEffect } from "react";
import {
  Modal,
  ProgressBar,
  BlockStack,
  Text,
  Badge,
  Icon
} from "@shopify/polaris";
import { TickMinor, CancelMinor } from "@shopify/polaris-icons";

interface ScanStep {
  label: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export function ScanProgress({ isOpen, onClose, productName }: {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
}) {
  const [steps, setSteps] = useState<ScanStep[]>([
    { label: 'Generating question', status: 'pending' },
    { label: 'Scanning ChatGPT', status: 'pending' },
    { label: 'Scanning Gemini', status: 'pending' },
    { label: 'Analyzing results', status: 'pending' },
    { label: 'Generating recommendations', status: 'pending' }
  ]);
  
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    if (!isOpen) return;
    
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= steps.length) {
          clearInterval(interval);
          setTimeout(onClose, 2000);
          return prev;
        }
        
        // Update step status
        setSteps(prevSteps => {
          const newSteps = [...prevSteps];
          if (prev > 0) newSteps[prev - 1].status = 'completed';
          if (prev < newSteps.length) newSteps[prev].status = 'running';
          return newSteps;
        });
        
        setProgress((prev + 1) * 20);
        return prev + 1;
      });
    }, 2000);
    
    return () => clearInterval(interval);
  }, [isOpen]);
  
  const getStepIcon = (status: string) => {
    if (status === 'completed') return <Icon source={TickMinor} tone="success" />;
    if (status === 'failed') return <Icon source={CancelMinor} tone="critical" />;
    return null;
  };
  
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={`Scanning: ${productName}`}
      primaryAction={{
        content: 'Cancel',
        onAction: onClose,
        disabled: progress >= 100
      }}
    >
      <Modal.Section>
        <BlockStack gap="400">
          <ProgressBar 
            progress={progress} 
            tone="primary"
            size="small"
          />
          
          <Text variant="bodyMd" tone="subdued">
            {progress < 100 ? 'Scanning in progress...' : 'Scan completed!'}
          </Text>
          
          <BlockStack gap="200">
            {steps.map((step, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {getStepIcon(step.status)}
                <Text 
                  variant="bodyMd"
                  tone={step.status === 'running' ? 'base' : 'subdued'}
                >
                  {step.label}
                </Text>
                {step.status === 'running' && (
                  <Badge size="small">In progress</Badge>
                )}
              </div>
            ))}
          </BlockStack>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
