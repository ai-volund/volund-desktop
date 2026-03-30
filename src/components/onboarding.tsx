import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, type AgentProfile } from "@/lib/volund-api";
import { Bot, MessageSquare, ArrowRight, Sparkles } from "lucide-react";

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  useEffect(() => {
    api.listAgentProfiles().then(setAgents).catch(() => {});
  }, []);

  if (step === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <Sparkles className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl">Welcome to Volund</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground">
              Volund is your multi-agent AI platform. You can chat with specialist
              agents that have different skills — research, coding, email, and more.
            </p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-2">
                <Bot className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Specialist Agents</p>
              </div>
              <div className="space-y-2">
                <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Multi-Agent Chat</p>
              </div>
              <div className="space-y-2">
                <Sparkles className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Extensible Skills</p>
              </div>
            </div>
            <Button onClick={() => setStep(1)} className="w-full">
              Get Started <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-xl">Choose an Agent</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Pick an agent to start your first conversation. You can always switch later.
          </p>
          {agents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No agents available yet. Your admin needs to set up agent profiles.
            </p>
          ) : (
            <div className="space-y-2">
              {agents.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelectedAgent(a.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                    selectedAgent === a.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <p className="text-sm font-medium">{a.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.model_provider}/{a.model_id} · {a.profile_type}
                  </p>
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onComplete} className="flex-1">
              Skip
            </Button>
            <Button
              onClick={onComplete}
              disabled={!selectedAgent && agents.length > 0}
              className="flex-1"
            >
              Start Chatting
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
