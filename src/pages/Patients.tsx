import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Filter, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Input } from "@/components/ui/input";
import { PatientRegistrationForm, PatientFormData } from "@/components/patients/PatientRegistrationForm";
import { PrakritiPromptModal } from "@/components/patients/PrakritiPromptModal";
import { PatientCard } from "@/components/patients/PatientCard";
import { patientsAPI } from "@/lib/api";
import { toast } from "sonner";

type Patient = {
  _id?: string;
  id?: string;
  name: string;
  age: number;
  gender: string;
  contact: string;
  blood_group?: string | null;
  address?: string | null;
  serial_no?: string | null;
  abha_id?: string | null;
  resident_status?: string | null;
  socio_economic_status?: string | null;
  education?: string | null;
  occupation?: string | null;
  opd_no?: string | null;
  ipd_no?: string | null;
  chief_complaint?: string | null;
  registration_date?: string | null;
  createdAt?: string;
  created_at?: string;
  prakriti?: string | null;
  status?: "In Treatment" | "Scheduled" | "Completed" | "New";
};

export default function Patients() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPrakritiPrompt, setShowPrakritiPrompt] = useState(false);
  const [newPatientData, setNewPatientData] = useState<{ id: string; name: string } | null>(null);

  // Fetch patients with their prakriti assessment status
  const fetchPatients = async () => {
    setIsLoading(true);
    try {
      // Fetch patients (already enriched with prakriti and status from backend)
      const patientsData = await patientsAPI.getAll();
      setPatients(patientsData);
    } catch (error: any) {
      console.error("Error fetching patients:", error);
      toast.error(error.message || "Failed to load patients");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const filteredPatients = patients.filter((patient) =>
    patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.contact.includes(searchQuery) ||
    (patient.blood_group && patient.blood_group.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleAddPatient = async (formData: PatientFormData) => {
    setIsSaving(true);
    try {
      const data = await patientsAPI.create({
        name: formData.name,
        age: parseInt(formData.age),
        gender: formData.gender,
        contact: formData.contact,
        blood_group: formData.blood_group || null,
        address: formData.address || null,
        serial_no: formData.serial_no || null,
        abha_id: formData.abha_id || null,
        resident_status: formData.resident_status || null,
        socio_economic_status: formData.socio_economic_status || null,
        education: formData.education || null,
        occupation: formData.occupation || null,
        opd_no: formData.opd_no || null,
        ipd_no: formData.ipd_no || null,
        chief_complaint: formData.chief_complaint || null,
        registration_date: formData.registration_date.toISOString().split("T")[0],
      });

      toast.success("Patient registered successfully!");
      setShowAddModal(false);
      setNewPatientData({ id: data._id || data.id, name: data.name });
      setShowPrakritiPrompt(true);
      fetchPatients();
    } catch (error: any) {
      console.error("Error adding patient:", error);
      
      // Better error messages
      if (error.message?.includes("Unable to connect")) {
        toast.error("Cannot connect to server. Please ensure the backend is running on port 5000");
      } else if (error.message?.includes("401") || error.message?.includes("Not authorized")) {
        toast.error("Authentication required. Please login first.");
      } else if (error.message?.includes("duplicate") || error.message?.includes("ABHA")) {
        toast.error("A patient with this ABHA ID already exists");
      } else {
        toast.error(error.message || "Failed to register patient");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartPrakritiAssessment = () => {
    if (newPatientData) {
      setShowPrakritiPrompt(false);
      navigate(`/prakriti?patientId=${newPatientData.id}&patientName=${encodeURIComponent(newPatientData.name)}`);
    }
  };

  const handleSkipPrakriti = () => {
    setShowPrakritiPrompt(false);
    setNewPatientData(null);
  };

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
              Patient Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage and track all patients at your center
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add New Patient
          </motion.button>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, contact, or blood group..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-11 rounded-xl border-border bg-card"
            />
          </div>
          <button
            onClick={fetchPatients}
            className="flex items-center gap-2 px-4 py-2.5 bg-muted text-muted-foreground rounded-xl font-medium text-sm hover:bg-muted/80 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-muted text-muted-foreground rounded-xl font-medium text-sm hover:bg-muted/80 transition-colors">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </motion.div>

        {/* Patient Cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-card rounded-2xl border border-border p-5 animate-pulse"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-border space-y-2">
                  <div className="h-3 bg-muted rounded w-full" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredPatients.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-muted-foreground">
              {searchQuery ? "No patients found matching your search." : "No patients registered yet."}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 text-primary hover:underline"
              >
                Add your first patient
              </button>
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredPatients.map((patient, index) => (
              <PatientCard
                key={patient._id || patient.id}
                patient={patient}
                index={index}
                onClick={() => navigate(`/prakriti?patientId=${patient._id || patient.id}&patientName=${encodeURIComponent(patient.name)}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Patient Modal */}
      <AnimatePresence>
        {showAddModal && (
          <PatientRegistrationForm
            onSubmit={handleAddPatient}
            onCancel={() => setShowAddModal(false)}
            isLoading={isSaving}
          />
        )}
      </AnimatePresence>

      {/* Prakriti Prompt Modal */}
      <AnimatePresence>
        {showPrakritiPrompt && newPatientData && (
          <PrakritiPromptModal
            patientName={newPatientData.name}
            onStartAssessment={handleStartPrakritiAssessment}
            onSkip={handleSkipPrakriti}
          />
        )}
      </AnimatePresence>
    </MainLayout>
  );
}
