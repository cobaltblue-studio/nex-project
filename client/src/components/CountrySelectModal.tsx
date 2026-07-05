import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Loader2, ChevronRight } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Argentina", "Australia", "Austria",
  "Bangladesh", "Belgium", "Bolivia", "Brazil", "Canada", "Chile", "China",
  "Colombia", "Croatia", "Czech Republic", "Denmark", "Ecuador", "Egypt",
  "Ethiopia", "Finland", "France", "Germany", "Ghana", "Greece", "Guatemala",
  "Hungary", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
  "Japan", "Jordan", "Kenya", "Malaysia", "Mexico", "Morocco", "Netherlands",
  "New Zealand", "Nigeria", "Norway", "Pakistan", "Peru", "Philippines", "Poland",
  "Portugal", "Romania", "Russia", "Saudi Arabia", "Senegal", "Serbia",
  "Singapore", "South Africa", "South Korea", "Spain", "Sri Lanka", "Sweden",
  "Switzerland", "Taiwan", "Tanzania", "Thailand", "Turkey", "Uganda", "Ukraine",
  "United Arab Emirates", "United Kingdom", "United States", "Uruguay",
  "Venezuela", "Vietnam", "Zimbabwe", "Other",
];

interface Profile {
  id: number;
  country: string | null;
  username: string;
  role?: string;
}

export function CountrySelectModal() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [selectedCountry, setSelectedCountry] = useState("");

  const { data: profile, isLoading: profileLoading } = useQuery<Profile>({
    queryKey: ["/api/profiles/me"],
    enabled: isAuthenticated,
    retry: false,
  });

  const updateMutation = useMutation({
    mutationFn: (country: string) =>
      apiRequest("PATCH", "/api/profiles/me", { country }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles/me"] });
      toast({
        title: "COUNTRY SAVED",
        description: "Your country has been set.",
      });
    },
    onError: () => {
      toast({
        title: "ERROR",
        description: "Could not save country. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!selectedCountry) {
      toast({
        title: "SELECT A COUNTRY",
        description: "Please select your country to continue.",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate(selectedCountry);
  };

  const isVisible =
    !authLoading &&
    !profileLoading &&
    isAuthenticated &&
    profile !== undefined &&
    profile !== null &&
    profile.role !== "admin" &&
    !profile.country;

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/90 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="relative z-10 w-full max-w-md mx-4 bg-[#080808] border border-white/10 rounded-sm shadow-[0_0_80px_rgba(0,240,255,0.08)]"
          data-testid="modal-country-select"
        >
          <div className="flex items-center gap-3 px-8 pt-8 pb-6 border-b border-white/5">
            <Globe className="w-5 h-5 text-primary flex-shrink-0" />
            <span className="text-white font-display font-bold text-lg uppercase tracking-widest">
              SELECT YOUR COUNTRY
            </span>
          </div>

          <div className="p-8 space-y-6">
            <p className="text-zinc-500 text-[11px] font-bold uppercase tracking-widest text-center">
              Tell us where you're from to complete your profile
            </p>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                <Globe className="w-3 h-3" />
                COUNTRY *
              </label>
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-white/10 text-white text-sm px-4 py-3 rounded-sm focus:outline-none focus:border-primary/50 appearance-none font-mono transition-colors"
                data-testid="select-country-modal"
              >
                <option value="">— Select Country —</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmit}
              disabled={updateMutation.isPending || !selectedCountry}
              data-testid="button-save-country"
              className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-black text-[10px] font-bold uppercase tracking-widest rounded-sm hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  CONFIRM <ChevronRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
