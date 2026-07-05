import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

// Components
import { Layout } from "@/components/Layout";
import { OnboardingModal } from "@/components/OnboardingModal";
import { CountrySelectModal } from "@/components/CountrySelectModal";

// Pages
import { Home } from "@/pages/Home";
import { Join } from "@/pages/Join";
import { CreatorList } from "@/pages/CreatorList";
import { ProfileMe } from "@/pages/ProfileMe";
import { CreatorAnalytics } from "@/pages/CreatorAnalytics";
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
import AdminLogin from "@/pages/AdminLogin";
import NexRadio from "@/pages/Radio";
import Community from "@/pages/Community";
import About from "@/pages/About";
import DataPolicy from "@/pages/DataPolicy";
import ChartMethodology from "@/pages/ChartMethodology";
import Auth from "@/pages/Auth";
import { AnalyticsBootstrap } from "@/components/AnalyticsBootstrap";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/join" component={Join} />
        <Route path="/auth" component={Auth} />
        <Route path="/new" component={New} />
        <Route path="/music" component={Music} />
        <Route path="/music-video" component={MusicVideo} />
        <Route path="/creators" component={CreatorList} />
        <Route path="/submit" component={SubmitTrack} />
        <Route path="/upload" component={UploadTrack} />
        <Route path="/my-tracks" component={MyTracks} />
        <Route path="/profile" component={CreatorList} />
        <Route path="/profile/me" component={ProfileMe} />
        <Route path="/profile/me/analytics" component={CreatorAnalytics} />
        <Route path="/profile/:name" component={ProfileMe} />
        <Route path="/battle" component={Battle} />
        <Route path="/rising" component={Rising} />
        <Route path="/community/:id" component={Community} />
        <Route path="/community" component={Community} />
        <Route path="/submit-track" component={SubmitTrack} />
        <Route path="/radio" component={NexRadio} />
        <Route path="/admin" component={AdminPanel} />
        <Route path="/admin-login" component={AdminLogin} />
        <Route path="/about" component={About} />
        <Route path="/data-policy" component={DataPolicy} />
        <Route path="/chart-methodology" component={ChartMethodology} />
        <Route path="/track/:id" component={TrackDetail} />
        <Route path="/mv/:id" component={MVDetail} />
        <Route component={NotFound} />
      </Switch>
      <OnboardingModal />
      <CountrySelectModal />
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AnalyticsBootstrap />
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

