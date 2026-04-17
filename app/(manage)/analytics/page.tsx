

'use client';
import * as React from 'react';
import { BarChart, LineChart } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Users, ThumbsUp, MessageCircle, ArrowUp, ArrowDown, Share2, MousePointerClick, AlertCircle } from 'lucide-react';
import { Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { getConnectedAccounts, getPageInsightsAction } from '@/services/facebook/insights';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { format, subDays } from 'date-fns';

const chartConfig = {
    followers: {
        label: 'Followers',
        color: 'hsl(var(--chart-1))',
    },
    engagement: {
        label: 'Engagement',
        color: 'hsl(var(--chart-2))',
    },
};


type ConnectedAccount = {
    id: string;
    platform: string;
    name: string;
};

type InsightData = {
    totalFollowers?: number;
    totalEngagement?: number;
    totalReach?: number;
    totalClicks?: number;
    followerHistory?: { date: string, followers: number }[];
    engagementHistory?: { date: string, engagement: number }[];
};


export default function AnalyticsPage() {
    const [accounts, setAccounts] = React.useState<ConnectedAccount[]>([]);
    const [selectedAccountId, setSelectedAccountId] = React.useState<string | null>(null);
    const [loadingAccounts, setLoadingAccounts] = React.useState(true);
    const [loadingInsights, setLoadingInsights] = React.useState(false);
    const [insightData, setInsightData] = React.useState<InsightData | null>(null);
    const [requiresReauth, setRequiresReauth] = React.useState(false);

    React.useEffect(() => {
        const fetchAccounts = async () => {
            setLoadingAccounts(true);
            const result = await getConnectedAccounts();
            if (result.success && result.accounts) {
                const facebookAccounts = result.accounts.filter(acc => acc.platform === 'Facebook');
                setAccounts(facebookAccounts);
                if (facebookAccounts.length > 0) {
                    setSelectedAccountId(facebookAccounts[0].id);
                }
            }
            setLoadingAccounts(false);
        };
        fetchAccounts();
    }, []);

    React.useEffect(() => {
        if (!selectedAccountId) {
            setInsightData(null);
            setRequiresReauth(false);
            return;
        };

        const fetchInsights = async () => {
            setLoadingInsights(true);
            setRequiresReauth(false); // Reset the flag before fetching
            const result = await getPageInsightsAction(selectedAccountId);
            if (result.success && result.data) {

                const followerHistory = result.data.followerHistory.map(item => ({
                    date: format(new Date(item.end_time), 'MMM d'),
                    followers: item.value,
                })).reverse();

                const totalFollowers = followerHistory.length > 0 ? followerHistory[followerHistory.length - 1].followers : 0;

                setInsightData({
                    totalFollowers,
                    totalEngagement: result.data.totalEngagement,
                    totalReach: result.data.totalReach,
                    followerHistory,
                    engagementHistory: [
                        { date: 'Jan', engagement: 2.1 },
                        { date: 'Feb', engagement: 2.5 },
                        { date: 'Mar', engagement: 2.2 },
                        { date: 'Apr', engagement: 3.1 },
                        { date: 'May', engagement: 3.5 },
                        { date: 'Jun', engagement: 3.2 },
                    ] // Placeholder as engagement rate history is complex
                });
            } else {
                // Check if re-authentication is required
                if (result.requiresReauth) {
                    setRequiresReauth(true);
                    // Don't log re-auth errors to console since we show a user-friendly alert
                } else {
                    // Only log unexpected errors to console
                    console.error("Failed to fetch insights:", result.error);
                }
                setInsightData(null);
            }
            setLoadingInsights(false);
        };
        fetchInsights();
    }, [selectedAccountId]);


    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
                <div>
                    {loadingAccounts ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                        <Select
                            onValueChange={(value) => setSelectedAccountId(value)}
                            value={selectedAccountId || ''}
                            disabled={accounts.length === 0}
                        >
                            <SelectTrigger className="w-full md:w-[280px]">
                                <SelectValue placeholder="Select a Facebook Page..." />
                            </SelectTrigger>
                            <SelectContent>
                                {accounts.map(account => (
                                    <SelectItem key={account.id} value={account.id}>
                                        {account.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>
            </div>

            {/* Re-authentication Alert */}
            {requiresReauth && selectedAccountId && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Session Expired</AlertTitle>
                    <AlertDescription className="flex flex-col gap-3">
                        <p>
                            Your Facebook session has expired or been invalidated. This may happen if you changed your password or Facebook updated your session for security reasons.
                        </p>
                        <div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    // Redirect to the add account page to re-authenticate
                                    window.location.href = '/accounts/add';
                                }}
                            >
                                Reconnect Facebook Account
                            </Button>
                        </div>
                    </AlertDescription>
                </Alert>
            )}

            {loadingInsights ? (
                <div className="flex justify-center items-center h-96">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : !insightData || !selectedAccountId ? (
                <Card className="h-96 flex items-center justify-center">
                    <CardDescription>
                        {accounts.length === 0 ? 'No Facebook accounts connected.' : 'Select a page to view its analytics.'}
                    </CardDescription>
                </Card>
            ) : (
                <>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Followers</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{insightData.totalFollowers?.toLocaleString() || 0}</div>
                                <p className="text-xs text-muted-foreground flex items-center">
                                    <ArrowUp className="h-3 w-3 text-green-500 mr-1" />
                                    +20.1% from last month
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
                                <ThumbsUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{insightData.totalEngagement?.toLocaleString() || 0}</div>
                                <p className="text-xs text-muted-foreground flex items-center">
                                    <ArrowUp className="h-3 w-3 text-green-500 mr-1" />
                                    +2.2% from last month
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Post Reach</CardTitle>
                                <Share2 className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{insightData.totalReach?.toLocaleString() || 0}</div>
                                <p className="text-xs text-muted-foreground flex items-center">
                                    <ArrowDown className="h-3 w-3 text-red-500 mr-1" />
                                    -5.1% from last month
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
                                <MousePointerClick className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">1,892</div>
                                <p className="text-xs text-muted-foreground flex items-center">
                                    <ArrowUp className="h-3 w-3 text-green-500 mr-1" />
                                    +15% from last month
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Followers Over Time</CardTitle>
                                <CardDescription>A breakdown of your followers in the last 30 days.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                                    <LineChart data={insightData.followerHistory} accessibilityLayer>
                                        <CartesianGrid vertical={false} />
                                        <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} />
                                        <YAxis hide domain={['dataMin - 100', 'dataMax + 100']} />
                                        <ChartTooltip
                                            cursor={false}
                                            content={<ChartTooltipContent indicator="dot" />}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="followers"
                                            stroke="var(--color-followers)"
                                            strokeWidth={2}
                                            dot={{ r: 4, fill: "var(--color-followers)" }}
                                        />
                                    </LineChart>
                                </ChartContainer>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Engagement Over Time</CardTitle>
                                <CardDescription>Tracking your average post engagement rate over the last 6 months.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                                    <LineChart data={insightData.engagementHistory} accessibilityLayer>
                                        <CartesianGrid vertical={false} />
                                        <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} />
                                        <YAxis domain={[0, 5]} tickFormatter={(value) => `${value}%`} />
                                        <ChartTooltip
                                            cursor={false}
                                            content={<ChartTooltipContent indicator="dot" />}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="engagement"
                                            stroke="var(--color-engagement)"
                                            strokeWidth={2}
                                            dot={{ r: 4, fill: "var(--color-engagement)" }}
                                        />
                                    </LineChart>
                                </ChartContainer>
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
}
