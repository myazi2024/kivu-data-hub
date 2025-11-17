import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, AreaChart, Area } from 'recharts';

interface AdditionalChartsProps {
  loading: boolean;
  paymentMethodsData?: Array<{ method: string; count: number; total: number }>;
  servicesData?: Array<{ service_name: string; count: number; revenue: number }>;
  userGrowthData?: Array<{ date: string; new_users: number; cumulative: number }>;
  contributionApprovalData?: Array<{ date: string; approved: number; rejected: number; pending: number }>;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export function AdditionalCharts({
  loading,
  paymentMethodsData = [],
  servicesData = [],
  userGrowthData = [],
  contributionApprovalData = [],
}: AdditionalChartsProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="p-4 md:p-6">
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0">
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Payment Methods Distribution */}
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-sm md:text-base">Répartition des modes de paiement</CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0">
          {paymentMethodsData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={paymentMethodsData}
                  dataKey="count"
                  nameKey="method"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ method, count }) => `${method}: ${count}`}
                >
                  {paymentMethodsData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Services Usage */}
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-sm md:text-base">Services les plus utilisés</CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0">
          {servicesData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={servicesData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="service_name" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* User Growth */}
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-sm md:text-base">Évolution des utilisateurs</CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0">
          {userGrowthData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="new_users" stroke="hsl(var(--primary))" name="Nouveaux" />
                <Line type="monotone" dataKey="cumulative" stroke="hsl(var(--secondary))" name="Cumulé" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Contribution Approval Rate */}
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-sm md:text-base">Taux d'approbation des contributions</CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0">
          {contributionApprovalData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={contributionApprovalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="approved" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" name="Approuvées" />
                <Area type="monotone" dataKey="rejected" stackId="1" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" name="Rejetées" />
                <Area type="monotone" dataKey="pending" stackId="1" stroke="hsl(var(--muted))" fill="hsl(var(--muted))" name="En attente" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
