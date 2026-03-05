import { useState } from "react";
import { motion } from "framer-motion";
import { User, Calendar, Check, ChevronDown, ChevronUp, Utensils, Loader2, AlertTriangle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { patientsAPI, treatmentJourneyAPI, prakritiAPI, vitalsAPI } from "@/lib/api";
import { toast } from "sonner";

interface DayPlan {
  _id?: string;
  day: number;
  therapy?: string;
  therapy_name?: string;
  diet?: string;
  vitals?: {
    pulse?: string;
    bp?: string;
    appetite?: string;
  };
  completed?: boolean;
  status?: string;
}

interface Patient {
  _id: string;
  name: string;
  gender?: string;
}

interface PrakritiAssessment {
  _id?: string;
  vata?: number;
  pitta?: number;
  kapha?: number;
}

export default function TreatmentJourney() {
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const queryClient = useQueryClient();

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

  const { data: journey = [], isLoading: loadingJourney } = useQuery({
    queryKey: ["treatment-journey", selectedPatientId],
    queryFn: async () => {
      if (!selectedPatientId) return [];
      try {
        return await treatmentJourneyAPI.getAll(selectedPatientId);
      } catch (error: any) {
        toast.error(error.message || "Failed to load treatment journey");
        return [];
      }
    },
    enabled: !!selectedPatientId,
  });

  const { data: prakritiData } = useQuery({
    queryKey: ["prakriti", selectedPatientId],
    queryFn: async () => {
      if (!selectedPatientId) return null;
      try {
        const assessments = await prakritiAPI.getAll(selectedPatientId);
        return assessments && assessments.length > 0 ? assessments[0] : null;
      } catch (error: any) {
        return null;
      }
    },
    enabled: !!selectedPatientId,
  });

  const selectedPatient = patients.find((p: Patient) => p._id === selectedPatientId);
  const sortedJourney = [...journey].sort((a: DayPlan, b: DayPlan) => a.day - b.day);
  const currentDay = sortedJourney.filter((d: DayPlan) => d.completed || d.status === "completed").length + 1;
  const progress = sortedJourney.length > 0 
    ? (sortedJourney.filter((d: DayPlan) => d.completed || d.status === "completed").length / sortedJourney.length) * 100 
    : 0;

  const updateJourneyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<DayPlan> }) => {
      return await treatmentJourneyAPI.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["treatment-journey", selectedPatientId] });
      toast.success("Session marked as completed");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update session");
    },
  });

  const handleCompleteSession = (dayPlan: DayPlan) => {
    if (!dayPlan._id) {
      toast.error("Cannot complete session: Missing ID");
      return;
    }
    updateJourneyMutation.mutate({
      id: dayPlan._id,
      data: { completed: true, status: "completed" },
    });
  };

  const getPrakritiLabel = (prakriti: PrakritiAssessment | null) => {
    if (!prakriti) return "Not assessed";
    const { vata = 0, pitta = 0, kapha = 0 } = prakriti;
    const max = Math.max(vata, pitta, kapha);
    const types: string[] = [];
    if (vata === max) types.push("Vata");
    if (pitta === max) types.push("Pitta");
    if (kapha === max) types.push("Kapha");
    return types.join("-") || "Not assessed";
  };

  if (loadingPatients) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading patients...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

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
              Treatment Journey
            </h1>
            <p className="text-muted-foreground mt-1">
              Track and manage patient treatment progress
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
                  patients.map((p: Patient) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {!selectedPatientId ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-card rounded-2xl border border-border p-12 text-center"
          >
            <User className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-display text-xl font-semibold mb-2">Select a Patient</h3>
            <p className="text-muted-foreground">
              Choose a patient to view their treatment journey
            </p>
          </motion.div>
        ) : loadingJourney ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-card rounded-2xl border border-border p-12 text-center"
          >
            <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin mb-4" />
            <h3 className="font-display text-xl font-semibold mb-2">Loading Journey</h3>
            <p className="text-muted-foreground">
              Fetching treatment journey data...
            </p>
          </motion.div>
        ) : sortedJourney.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-card rounded-2xl border border-border p-12 text-center"
          >
            <Calendar className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-display text-xl font-semibold mb-2">No Treatment Journey</h3>
            <p className="text-muted-foreground">
              No treatment journey found for this patient. Start by creating a treatment plan.
            </p>
          </motion.div>
        ) : (
          <>
            {/* Patient Info & Progress */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-6 shadow-sm">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-display text-xl font-semibold">
                    {selectedPatient?.name?.split(' ').map((n: string) => n[0]).join('') || "P"}
                  </div>
                  <div>
                    <h2 className="font-display text-2xl font-semibold">{selectedPatient?.name || "Patient"}</h2>
                    <p className="text-muted-foreground">Prakriti: {getPrakritiLabel(prakritiData as PrakritiAssessment)}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Treatment Progress</span>
                    <span className="font-medium">Day {currentDay} of {sortedJourney.length}</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                      className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {sortedJourney.filter((d: DayPlan) => d.completed || d.status === "completed").length} sessions completed
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl border border-primary/20 p-6">
                <h3 className="font-display text-lg font-semibold mb-4">Today's Session</h3>
                {sortedJourney[currentDay - 1] && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Day {currentDay}</span>
                    </div>
                    <p className="font-semibold">
                      {sortedJourney[currentDay - 1]?.therapy_name || sortedJourney[currentDay - 1]?.therapy || "No therapy scheduled"}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Utensils className="w-4 h-4" />
                      <span>{sortedJourney[currentDay - 1]?.diet || "No diet specified"}</span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Journey Timeline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card rounded-2xl border border-border p-6 shadow-sm"
            >
              <h3 className="font-display text-lg font-semibold mb-6">Treatment Timeline</h3>

              <div className="space-y-4">
                {sortedJourney.map((day: DayPlan, index: number) => {
                  const isExpanded = expandedDay === index;
                  const isCurrent = index === currentDay - 1;
                  const isCompleted = day.completed || day.status === "completed";

                  return (
                    <motion.div
                      key={day._id || index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + index * 0.05 }}
                      className={`rounded-xl border overflow-hidden transition-all ${
                        isCompleted
                          ? "bg-primary/5 border-primary/20"
                          : isCurrent
                          ? "bg-highlight/5 border-highlight/30"
                          : "bg-muted/30 border-border"
                      }`}
                    >
                      <button
                        onClick={() => setExpandedDay(isExpanded ? null : index)}
                        className="w-full p-4 flex items-center justify-between text-left"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${
                              isCompleted
                                ? "bg-primary text-primary-foreground"
                                : isCurrent
                                ? "bg-highlight text-highlight-foreground"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {isCompleted ? <Check className="w-5 h-5" /> : day.day}
                          </div>
                          <div>
                            <p className="font-semibold">
                              Day {day.day}: {day.therapy_name || day.therapy || "No therapy"}
                            </p>
                            <p className="text-sm text-muted-foreground">{day.diet || "No diet specified"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {isCurrent && !isCompleted && (
                            <span className="px-2 py-1 bg-highlight/20 text-highlight text-xs font-medium rounded-lg">
                              Today
                            </span>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="px-4 pb-4 border-t border-border/50"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                            <div className="p-4 bg-background rounded-xl">
                              <p className="text-xs text-muted-foreground mb-1">Pulse Rate</p>
                              <p className="font-semibold">{day.vitals?.pulse || "—"} BPM</p>
                            </div>
                            <div className="p-4 bg-background rounded-xl">
                              <p className="text-xs text-muted-foreground mb-1">Blood Pressure</p>
                              <p className="font-semibold">{day.vitals?.bp || "—"}</p>
                            </div>
                            <div className="p-4 bg-background rounded-xl">
                              <p className="text-xs text-muted-foreground mb-1">Appetite</p>
                              <p className="font-semibold">{day.vitals?.appetite || "—"}</p>
                            </div>
                          </div>

                          {!isCompleted && isCurrent && (
                            <Button
                              onClick={() => handleCompleteSession(day)}
                              disabled={updateJourneyMutation.isPending}
                              className="w-full mt-4 rounded-xl bg-primary text-primary-foreground"
                            >
                              <Check className="w-4 h-4 mr-2" />
                              {updateJourneyMutation.isPending ? "Completing..." : "Complete Session"}
                            </Button>
                          )}
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
