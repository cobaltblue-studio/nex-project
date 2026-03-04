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
import { ProfileMe } from "@/pages/ProfileMe";
import { ProfileDetail } from "@/pages/ProfileDetail";
import { WorkDetail } from "@/pages/WorkDetail";
import { Submit } from "@/pages/Submit";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/board" component={Home} />
        <Route path="/join" component={Join} />
        <Route path="/submit" component={Submit} />
        <Route path="/profile/me" component={ProfileMe} />
        <Route path="/profile/:id" component={ProfileDetail} />
        <Route path="/work/:id" component={WorkDetail} />
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
