
import { Shield, CheckCircle, Bell, Users, BarChart3, Lock } from "lucide-react";

const features = [
    {
        name: "Role-Based Access Control",
        description:
            "Securely manage permissions with granular roles. Ensure the right people have access to the right data.",
        icon: Lock,
    },
    {
        name: "Real-time Mandate Tracking",
        description:
            "Monitor the status of all certifications and mandates in real-time. Never miss a compliance requirement.",
        icon: BarChart3,
    },
    {
        name: "Automated Notifications",
        description:
            "Receive automated alerts for upcoming expirations and pending actions. Keep your team proactive.",
        icon: Bell,
    },
    {
        name: "Centralized Repository",
        description:
            "Store all certification documents and records in a single, secure location for easy retrieval and auditing.",
        icon: Shield,
    },
    {
        name: "User Management",
        description:
            "Easily onboard and manage users, assign roles, and track individual progress.",
        icon: Users,
    },
    {
        name: "Compliance Reporting",
        description:
            "Generate detailed reports to demonstrate compliance to auditors and stakeholders.",
        icon: CheckCircle,
    },
];

export function Features() {
    return (
        <section id="features" className="container space-y-6 bg-slate-50 py-8 dark:bg-transparent md:py-12 lg:py-24">
            <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
                <h2 className="font-bold text-3xl leading-[1.1] sm:text-3xl md:text-6xl">
                    Features
                </h2>
                <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
                    Everything you need to manage certifications effectively.
                </p>
            </div>
            <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-3">
                {features.map((feature) => (
                    <div
                        key={feature.name}
                        className="relative overflow-hidden rounded-lg border bg-background p-2"
                    >
                        <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
                            <feature.icon className="h-12 w-12 text-primary" />
                            <div className="space-y-2">
                                <h3 className="font-bold">{feature.name}</h3>
                                <p className="text-sm text-muted-foreground">
                                    {feature.description}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
