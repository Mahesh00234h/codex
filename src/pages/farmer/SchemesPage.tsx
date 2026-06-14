import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Search, 
  Calendar, 
  IndianRupee, 
  ChevronRight,
  CheckCircle,
  Sparkles,
  Loader2,
  RefreshCw,
  ExternalLink,
  Filter
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useGovSchemes, GovScheme } from '@/hooks/useGovSchemes';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const indianStates = [
  'All India',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

const categories = [
  'All Categories',
  'Direct Benefit',
  'Insurance',
  'Credit',
  'Technical',
  'Subsidy',
  'Training',
];

const statusColors = {
  'open': 'bg-success/10 text-success',
  'closing-soon': 'bg-warning/10 text-warning',
  'closed': 'bg-muted text-muted-foreground',
};

export default function SchemesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('All India');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedScheme, setSelectedScheme] = useState<GovScheme | null>(null);
  const { schemes, isLoading, fetchSchemes, searchSchemes } = useGovSchemes();

  // Fetch schemes on mount
  useEffect(() => {
    fetchSchemes();
  }, [fetchSchemes]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        searchSchemes(searchQuery);
      } else {
        fetchSchemes({
          state: selectedState !== 'All India' ? selectedState : undefined,
          category: selectedCategory !== 'All Categories' ? selectedCategory : undefined,
        });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedState, selectedCategory, fetchSchemes, searchSchemes]);

  const handleRefresh = () => {
    fetchSchemes({
      query: searchQuery || undefined,
      state: selectedState !== 'All India' ? selectedState : undefined,
      category: selectedCategory !== 'All Categories' ? selectedCategory : undefined,
    });
  };

  const filteredSchemes = schemes.filter(s => {
    const matchesCategory = selectedCategory === 'All Categories' || s.category === selectedCategory;
    return matchesCategory;
  });

  return (
    <DashboardLayout 
      title="Government Schemes" 
      subtitle="Real-time AI-powered scheme discovery"
    >
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Schemes List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search schemes (e.g., 'crop insurance', 'subsidies')"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <Select value={selectedState} onValueChange={setSelectedState}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Select State" />
              </SelectTrigger>
              <SelectContent>
                {indianStates.map((state) => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Live Badge */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
            </span>
            <span>Live data powered by AI</span>
          </div>

          {/* Loading State */}
          {isLoading && schemes.length === 0 && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card rounded-2xl border p-5">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-4" />
                  <div className="flex gap-4">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Schemes List */}
          {!isLoading && filteredSchemes.length === 0 && (
            <div className="bg-muted/50 rounded-2xl p-8 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No schemes found. Try a different search.</p>
            </div>
          )}

          <div className="space-y-4">
            {filteredSchemes.map((scheme, i) => (
              <motion.div
                key={scheme.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedScheme(scheme)}
                className={cn(
                  "bg-card rounded-2xl border p-5 cursor-pointer transition-all duration-200 hover:shadow-lg",
                  selectedScheme?.id === scheme.id ? 'border-primary shadow-md' : 'border-border'
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-bold text-lg">{scheme.name}</h3>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-medium",
                        statusColors[scheme.status]
                      )}>
                        {scheme.status === 'closing-soon' ? 'Closing Soon' : scheme.status === 'open' ? 'Open' : 'Closed'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{scheme.ministry}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                </div>

                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2 text-success">
                    <IndianRupee className="h-4 w-4" />
                    <span>{scheme.benefit}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{scheme.deadline}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Details Panel */}
        <div className="lg:col-span-1">
          {selectedScheme ? (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-card rounded-2xl border border-border p-6 sticky top-24"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                  <FileText className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold">{selectedScheme.name}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {selectedScheme.category}
                  </span>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Benefit</p>
                  <p className="font-semibold text-success">{selectedScheme.benefit}</p>
                </div>

                {selectedScheme.description && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Description</p>
                    <p className="text-sm">{selectedScheme.description}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Eligibility</p>
                  <ul className="space-y-2">
                    {selectedScheme.eligibility.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Deadline</p>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    <span>{selectedScheme.deadline}</span>
                  </div>
                </div>
              </div>

              {/* AI Insight */}
              <div className="bg-primary/5 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium">AI Insight</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  This scheme is {selectedScheme.status === 'open' ? 'currently accepting applications' : 
                    selectedScheme.status === 'closing-soon' ? 'closing soon - apply immediately' : 
                    'not currently accepting applications'}. 
                  Based on common farmer profiles, you may qualify for this benefit.
                </p>
              </div>

              {selectedScheme.applicationUrl ? (
                <Button className="w-full" asChild>
                  <a href={selectedScheme.applicationUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Apply Now
                  </a>
                </Button>
              ) : (
                <Button className="w-full">
                  Apply Now
                </Button>
              )}
            </motion.div>
          ) : (
            <div className="bg-muted/50 rounded-2xl p-8 text-center sticky top-24">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Select a scheme to view details</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
