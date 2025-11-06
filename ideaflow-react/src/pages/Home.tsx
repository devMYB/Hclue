import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowRight, Users, Lightbulb, TrendingUp, Check } from 'lucide-react';

const Home: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect logged-in users to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const features = [
    {
      icon: <Users className="w-8 h-8 text-primary-600" />,
      title: "Collaborative Sessions",
      description: "Bring teams together for structured brainstorming with real-time participation and engagement tracking."
    },
    {
      icon: <Lightbulb className="w-8 h-8 text-primary-600" />,
      title: "AI-Powered Analysis",
      description: "Automatically organize ideas into themes and provide insights to help teams make data-driven decisions."
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-primary-600" />,
      title: "Progress Tracking",
      description: "Monitor session progress, participant engagement, and idea development through comprehensive analytics."
    }
  ];

  const benefits = [
    "Structured 6-phase ideation workflow",
    "Real-time collaboration tools",
    "Anonymous idea submission",
    "Voting and prioritization system",
    "AI-powered theme clustering",
    "Action item planning",
    "Export and sharing capabilities"
  ];

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-gray-900">
            Transform Your Team's
            <span className="text-primary-600"> Creative Process</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Hclue is the collaborative ideation platform that guides teams through structured 
            brainstorming sessions, from idea generation to actionable outcomes.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {isAuthenticated ? (
            <Link to="/dashboard" className="btn-primary text-lg px-8 py-3">
              Go to Dashboard
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn-primary text-lg px-8 py-3">
                Get Started Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
              <Link to="/pricing" className="btn-secondary text-lg px-8 py-3">
                View Pricing
              </Link>
            </>
          )}
        </div>

        <div className="text-sm text-gray-500">
          No credit card required • Free plan available • 2 minute setup
        </div>
      </section>

      {/* Features Section */}
      <section className="space-y-12">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Everything you need for effective ideation
          </h2>
          <p className="text-lg text-gray-600">
            Powerful tools to facilitate, capture, and organize your team's best ideas
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="card text-center space-y-4">
              <div className="flex justify-center">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                {feature.title}
              </h3>
              <p className="text-gray-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Process Section */}
      <section className="bg-gray-50 -mx-4 px-4 py-16">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Structured 6-Phase Workflow
            </h2>
            <p className="text-lg text-gray-600">
              Our proven methodology guides teams from idea generation to actionable outcomes
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { phase: 1, title: "Setup", description: "Create session and invite participants" },
              { phase: 2, title: "Generate", description: "Anonymous idea submission and brainstorming" },
              { phase: 3, title: "Review", description: "Collaborative idea review and discussion" },
              { phase: 4, title: "Vote", description: "Prioritize ideas through voting system" },
              { phase: 5, title: "Analyze", description: "AI-powered theme clustering and insights" },
              { phase: 6, title: "Plan", description: "Create actionable next steps and assignments" }
            ].map((step) => (
              <div key={step.phase} className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-semibold">
                    {step.phase}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {step.title}
                  </h3>
                </div>
                <p className="text-gray-600">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="grid lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-gray-900">
            Why teams choose Hclue
          </h2>
          <p className="text-lg text-gray-600">
            Transform chaotic brainstorming sessions into structured, productive 
            experiences that generate actionable results.
          </p>
          
          <ul className="space-y-3">
            {benefits.map((benefit, index) => (
              <li key={index} className="flex items-start space-x-3">
                <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-gradient-to-br from-primary-50 to-primary-100 p-8 rounded-2xl">
          <div className="text-center space-y-4">
            <div className="text-4xl font-bold text-primary-600">5x</div>
            <div className="text-lg font-semibold text-gray-900">More Actionable Ideas</div>
            <div className="text-gray-600">
              Teams using Hclue generate 5x more actionable ideas compared to 
              traditional brainstorming sessions.
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="text-center bg-primary-600 text-white -mx-4 px-4 py-16 rounded-2xl">
        <div className="space-y-6">
          <h2 className="text-3xl font-bold">
            Ready to transform your team's ideation?
          </h2>
          <p className="text-xl text-primary-100 max-w-2xl mx-auto">
            Join thousands of teams already using Hclue to create better ideas, 
            faster decisions, and stronger outcomes.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isAuthenticated ? (
              <Link to="/dashboard" className="bg-white text-primary-600 px-8 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors">
                Start Your First Session
              </Link>
            ) : (
              <>
                <Link to="/login" className="bg-white text-primary-600 px-8 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors">
                  Start Free Trial
                </Link>
                <Link to="/pricing" className="border border-white text-white px-8 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors">
                  View Pricing
                </Link>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;