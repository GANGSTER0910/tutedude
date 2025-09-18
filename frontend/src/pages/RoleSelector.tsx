import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Shield, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const RoleSelector = () => {
  const [selectedRole, setSelectedRole] = useState<'candidate' | 'interviewer' | null>(null);
  const navigate = useNavigate();

  const handleRoleSelect = (role: 'candidate' | 'interviewer') => {
    setSelectedRole(role);
    setTimeout(() => {
      navigate(`/${role}`);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Video Proctoring System
          </h1>
          <p className="text-xl text-gray-600">
            Choose your role to begin the interview session
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Candidate Card */}
          <Card 
            className={`p-8 cursor-pointer transition-all duration-300 hover:shadow-xl ${
              selectedRole === 'candidate' 
                ? 'ring-2 ring-blue-500 bg-blue-50' 
                : 'hover:shadow-lg'
            }`}
            onClick={() => handleRoleSelect('candidate')}
          >
            <div className="text-center space-y-6">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-blue-600" />
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Candidate
                </h2>
                <p className="text-gray-600 mb-4">
                  You are taking the interview. You'll see yourself and hear the interviewer.
                </p>
              </div>

              <div className="space-y-3 text-sm text-gray-500">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span>See your own video</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span>Hear interviewer's audio</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span>Mute/unmute controls</span>
                </div>
              </div>

              <Button 
                className="w-full"
                variant={selectedRole === 'candidate' ? 'default' : 'outline'}
              >
                {selectedRole === 'candidate' ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Joining as Candidate...
                  </>
                ) : (
                  <>
                    Join as Candidate
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Interviewer Card */}
          <Card 
            className={`p-8 cursor-pointer transition-all duration-300 hover:shadow-xl ${
              selectedRole === 'interviewer' 
                ? 'ring-2 ring-green-500 bg-green-50' 
                : 'hover:shadow-lg'
            }`}
            onClick={() => handleRoleSelect('interviewer')}
          >
            <div className="text-center space-y-6">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <Shield className="h-8 w-8 text-green-600" />
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Interviewer
                </h2>
                <p className="text-gray-600 mb-4">
                  You are conducting the interview. You'll see the candidate and control monitoring.
                </p>
              </div>

              <div className="space-y-3 text-sm text-gray-500">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>See candidate's video</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>Start/stop monitoring</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>Generate reports</span>
                </div>
              </div>

              <Button 
                className="w-full"
                variant={selectedRole === 'interviewer' ? 'default' : 'outline'}
              >
                {selectedRole === 'interviewer' ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Joining as Interviewer...
                  </>
                ) : (
                  <>
                    Join as Interviewer
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <Badge variant="outline" className="text-sm">
            Secure • Real-time • AI-powered
          </Badge>
        </div>
      </div>
    </div>
  );
};

export default RoleSelector;
