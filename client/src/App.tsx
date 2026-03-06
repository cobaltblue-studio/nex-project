import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

// Components
import { Layout } from "@/components/Layout";

// Pages
import { Home } from "@/pages/Home";
import { Join } from "@/pages/Join";
import { CreatorList } from "@/pages/CreatorList";
import { ProfileMe } from "@/pages/ProfileMe";
import { ProfileDetail } from "@/pages/ProfileDetail";
import { TrackDetail } from "@/pages/WorkDetail";
import { MVDetail } from "@/pages/MVDetail";
import { Submit } from "@/pages/Submit";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/music" component={Home} />
        <Route path="/music-video" component={Home} />
        <Route path="/submit" component={Submit} />
        <Route path="/profile" component={CreatorList} />
        <Route path="/profile/me" component={ProfileMe} />
        <Route path="/profile/:name" component={ProfileMe} />
        <Route path="/track/:id" component={TrackDetail} />
        <Route path="/mv/:id" component={MVDetail} />
        <Route component={NotFound} />
      </Switch>
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
