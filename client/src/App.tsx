import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

// Components
import { Layout } from "@/components/Layout";
import { OnboardingModal } from "@/components/OnboardingModal";

// Pages
import { Home } from "@/pages/Home";
import { Join } from "@/pages/Join";
import { CreatorList } from "@/pages/CreatorList";
import { ProfileMe } from "@/pages/ProfileMe";
import { ProfileDetail } from "@/pages/ProfileDetail";
import { TrackDetail } from "@/pages/WorkDetail";
import { MVDetail } from "@/pages/MVDetail";
import { UploadTrack } from "@/pages/UploadTrack";
import { MyTracks } from "@/pages/MyTracks";
import { Battle } from "@/pages/Battle";
import { Rising } from "@/pages/Rising";
import { Music } from "@/pages/Music";
import { New } from "@/pages/New";
import { MusicVideo } from "@/pages/MusicVideo";
import SubmitTrack from "@/pages/SubmitTrack";
import AdminPanel from "@/pages/AdminPanel";
import NexRadio from "@/pages/Radio";
import About from "@/pages/About";
import ChartMethodology from "@/pages/ChartMethodology";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/new" component={New} />
        <Route path="/music" component={Music} />
        <Route path="/music-video" component={MusicVideo} />
        <Route path="/creators" component={CreatorList} />
        <Route path="/submit" component={SubmitTrack} />
        <Route path="/upload" component={UploadTrack} />
        <Route path="/my-tracks" component={MyTracks} />
        <Route path="/profile" component={CreatorList} />
        <Route path="/profile/me" component={ProfileMe} />
        <Route path="/profile/:name" component={ProfileMe} />
        <Route path="/battle" component={Battle} />
        <Route path="/rising" component={Rising} />
        <Route path="/submit-track" component={SubmitTrack} />
        <Route path="/radio" component={NexRadio} />
        <Route path="/admin" component={AdminPanel} />
        <Route path="/about" component={About} />
        <Route path="/chart-methodology" component={ChartMethodology} />
        <Route path="/track/:id" component={TrackDetail} />
        <Route path="/mv/:id" component={MVDetail} />
        <Route component={NotFound} />
      </Switch>
      <OnboardingModal />
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
