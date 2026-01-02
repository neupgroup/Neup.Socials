
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building, PlusCircle } from 'lucide-react';

// Mock data for accounts. In a real app, this would be fetched from a database.
const accounts = [
  { id: '1', name: 'Innovate Inc.', description: 'Marketing and Technology Firm' },
  { id: '2', name: 'QuantumLeap', description: 'Small Business & E-commerce' },
  { id: '3', name: 'StellarSolutions', description: 'Global Enterprise Solutions' },
];

export default function AccountSelectorPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-full p-4 md:p-8">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold tracking-tight">Welcome to Neup.Socials</h1>
          <p className="mt-2 text-lg text-muted-foreground">Please select an account to manage.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((account) => (
            <Card key={account.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="p-3 bg-muted rounded-full">
                    <Building className="h-6 w-6 text-primary" />
                  </div>
                  {account.name}
                </CardTitle>
                <CardDescription>{account.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link href="/analytics">Select Account</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
          
          <Card className="border-dashed border-2 flex flex-col items-center justify-center text-center hover:border-primary hover:shadow-lg transition-all">
             <CardHeader>
                <CardTitle className="text-muted-foreground">New Account</CardTitle>
             </CardHeader>
             <CardContent>
                <Button variant="outline" size="lg">
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Create New
                </Button>
             </CardContent>
          </Card>
        </div>

        <div className="text-center mt-12">
            <p className="text-muted-foreground">Need help? <Link href="#" className="text-primary hover:underline">Contact Support</Link></p>
        </div>
      </div>
    </div>
  );
}
