import { useState, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { FileText, Download, Printer, Loader2, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DischargePrintView } from "@/components/discharge/DischargePrintView";
import { patientsAPI, prakritiAPI, treatmentJourneyAPI } from "@/lib/api";
import { toast } from "sonner";

interface PatientData {
  id: number;
  name: string;
  age: number;
  gender: string;
  contact: string;
  bloodGroup: string;
  admissionDate: string;
  dischargeDate: string;
  diagnosis: string;
  treatingDoctor: string;
  initialPrakriti: { vata: number; pitta: number; kapha: number };
  finalPrakriti: { vata: number; pitta: number; kapha: number };
  treatmentPlan: {
    day: number;
    therapy: string;
    completed: boolean;
  }[];
  dietAdvice: string[];
  followUp: string;
}

export default function DischargeSummary() {
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const { data: patients = [], isLoading: loadingPatients } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      try {
        return await patientsAPI.getAll();
      } catch (error: any) {
        toast.error(error.message || "Failed to load patients");
        return [];
      }
    },
  });

  const { data: prakritiAssessments = [], isLoading: loadingPrakriti } = useQuery({
    queryKey: ["prakriti", selectedPatientId],
    queryFn: async () => {
      if (!selectedPatientId) return [];
      try {
        return await prakritiAPI.getAll(selectedPatientId);
      } catch (error: any) {
        return [];
      }
    },
    enabled: !!selectedPatientId,
  });

  const { data: treatmentJourney = [], isLoading: loadingJourney } = useQuery({
    queryKey: ["treatment-journey", selectedPatientId],
    queryFn: async () => {
      if (!selectedPatientId) return [];
      try {
        return await treatmentJourneyAPI.getAll(selectedPatientId);
      } catch (error: any) {
        return [];
      }
    },
    enabled: !!selectedPatientId,
  });

  // Transform data into the format expected by DischargePrintView
  const dischargeData: PatientData | null = useMemo(() => {
    if (!selectedPatientId) return null;

    const patient = patients.find((p: any) => p._id === selectedPatientId);
    if (!patient) return null;

    // Get initial and final prakriti assessments
    const sortedPrakriti = [...prakritiAssessments].sort((a: any, b: any) => {
      const dateA = a.created_at || a.createdAt || "";
      const dateB = b.created_at || b.createdAt || "";
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    });

    const initialPrakriti = sortedPrakriti[0] || { vata: 0, pitta: 0, kapha: 0 };
    const finalPrakriti = sortedPrakriti[sortedPrakriti.length - 1] || initialPrakriti;

    // Transform treatment journey to treatment plan
    const sortedJourney = [...treatmentJourney].sort((a: any, b: any) => a.day - b.day);
    const treatmentPlan = sortedJourney.map((day: any) => ({
      day: day.day,
      therapy: day.therapy_name || day.therapy || "Not specified",
      completed: day.completed || day.status === "completed",
    }));

    // Calculate admission and discharge dates
    const admissionDate = patient.admission_date || patient.created_at || patient.createdAt || new Date().toISOString();
    const dischargeDate = new Date().toISOString();
    const admissionDateObj = new Date(admissionDate);
    const dischargeDateObj = new Date(dischargeDate);

    // Generate diet advice based on prakriti (simplified - in real app, this would come from backend)
    const dominantDosha = finalPrakriti.vata >= finalPrakriti.pitta && finalPrakriti.vata >= finalPrakriti.kapha
      ? "Vata"
      : finalPrakriti.pitta >= finalPrakriti.kapha
      ? "Pitta"
      : "Kapha";

    const dietAdviceMap: Record<string, string[]> = {
      Vata: [
        "Follow Vata-pacifying diet for 2 weeks",
        "Prefer warm, cooked, moist foods",
        "Avoid cold, raw, and dry foods",
        "Include ghee, sesame oil in cooking",
        "Drink warm water throughout the day",
        "Have dinner before 7 PM",
        "Avoid caffeine and carbonated drinks",
      ],
      Pitta: [
        "Follow Pitta-pacifying diet for 3 weeks",
        "Prefer cooling foods like cucumber, coconut",
        "Avoid spicy, sour, and fermented foods",
        "Include bitter gourd, neem in diet",
        "Drink cooling herbal teas",
        "Avoid direct sun exposure",
        "Practice stress management techniques",
      ],
      Kapha: [
        "Follow Kapha-pacifying diet for 2 weeks",
        "Prefer light, warm, and dry foods",
        "Avoid heavy, oily, and sweet foods",
        "Include ginger, turmeric in diet",
        "Drink warm water with honey",
        "Engage in regular physical activity",
        "Avoid daytime sleep",
      ],
    };

    const dietAdvice = dietAdviceMap[dominantDosha] || dietAdviceMap["Vata"];

    // Generate follow-up instructions
    const followUp = `Follow-up consultation after 2 weeks. Continue prescribed medications and follow the ${dominantDosha}-pacifying diet. Monitor your progress and report any concerns.`;

    return {
      id: 1,
      name: patient.name || "Patient",
      age: patient.age || 0,
      gender: patient.gender || "Not specified",
      contact: patient.phone || patient.contact || "Not provided",
      bloodGroup: patient.blood_group || patient.bloodGroup || "Not specified",
      admissionDate: admissionDateObj.toISOString().split('T')[0],
      dischargeDate: dischargeDateObj.toISOString().split('T')[0],
      diagnosis: patient.diagnosis || patient.chief_complaint || "Not specified",
      treatingDoctor: patient.treating_doctor || patient.treatingDoctor || "Dr. Ayurveda",
      initialPrakriti: {
        vata: initialPrakriti.vata || 0,
        pitta: initialPrakriti.pitta || 0,
        kapha: initialPrakriti.kapha || 0,
      },
      finalPrakriti: {
        vata: finalPrakriti.vata || 0,
        pitta: finalPrakriti.pitta || 0,
        kapha: finalPrakriti.kapha || 0,
      },
      treatmentPlan,
      dietAdvice,
      followUp,
    };
  }, [selectedPatientId, patients, prakritiAssessments, treatmentJourney]);

  const generatePDF = async () => {
    if (!printRef.current || !dischargeData) return;

    setIsGenerating(true);
    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;

      // Calculate how many pages we need
      const pageHeight = pdfHeight * (imgWidth / pdfWidth);
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", imgX, position * ratio, imgWidth * ratio, imgHeight * ratio);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", imgX, position * ratio, imgWidth * ratio, imgHeight * ratio);
        heightLeft -= pageHeight;
      }

      pdf.save(`Discharge_Summary_${dischargeData.name.replace(/\s+/g, "_")}.pdf`);
      toast.success("PDF generated successfully");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    const printContent = printRef.current.innerHTML;
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Discharge Summary - ${dischargeData?.name}</title>
            <style>
              body { font-family: 'Inter', sans-serif; padding: 20px; }
              .print-container { max-width: 800px; margin: 0 auto; }
            </style>
          </head>
          <body>
            <div class="print-container">${printContent}</div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const isLoading = loadingPatients || (selectedPatientId && (loadingPrakriti || loadingJourney));

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div>
            <h1 className="font-display text-3xl font-semibold text-foreground">
              Discharge Summary
            </h1>
            <p className="text-muted-foreground mt-1">
              Generate comprehensive discharge reports for patients
            </p>
          </div>
          <div className="w-full md:w-72">
            <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Select patient" />
              </SelectTrigger>
              <SelectContent>
                {patients.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No patients available
                  </div>
                ) : (
                  patients.map((p: any) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {isLoading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-card rounded-2xl border border-border p-12 text-center"
          >
            <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin mb-4" />
            <h3 className="font-display text-xl font-semibold mb-2">Loading Patient Data</h3>
            <p className="text-muted-foreground">
              Fetching discharge summary information...
            </p>
          </motion.div>
        ) : !selectedPatientId ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-card rounded-2xl border border-border p-12 text-center"
          >
            <FileText className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-display text-xl font-semibold mb-2">Select a Patient</h3>
            <p className="text-muted-foreground">
              Choose a patient to generate their discharge summary
            </p>
          </motion.div>
        ) : !dischargeData ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-card rounded-2xl border border-border p-12 text-center"
          >
            <AlertTriangle className="w-16 h-16 mx-auto text-destructive/30 mb-4" />
            <h3 className="font-display text-xl font-semibold mb-2">Patient Not Found</h3>
            <p className="text-muted-foreground">
              Unable to load patient data. Please try selecting another patient.
            </p>
          </motion.div>
        ) : (
          <>
            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex gap-4"
            >
              <Button
                onClick={generatePDF}
                disabled={isGenerating}
                className="rounded-xl bg-primary text-primary-foreground"
              >
                <Download className="w-4 h-4 mr-2" />
                {isGenerating ? "Generating..." : "Download PDF"}
              </Button>
              <Button
                onClick={handlePrint}
                variant="outline"
                className="rounded-xl"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </motion.div>

            {/* Preview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden"
            >
              <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Preview</span>
                <span className="text-xs text-muted-foreground">A4 Format</span>
              </div>
              <div className="p-6 bg-muted/10 overflow-auto max-h-[800px]">
                <div ref={printRef}>
                  <DischargePrintView patient={dischargeData} />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
