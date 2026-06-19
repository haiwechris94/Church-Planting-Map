import React, { useState } from 'react';
import {
  Save,
  X,
  Edit,
  Trash2,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Check,
  AlertCircle,
  Info,
  Layers,
  Map,
  Settings,
} from 'lucide-react';
import Button from './ui/Button';
import {
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  CardFooter,
  TabContainer,
  Tab,
  FilterChip,
  ToggleSwitch,
  Input,
  LayerPanel,
  LayerItem,
} from './ui';

/**
 * Design System Showcase Page
 * 
 * This page demonstrates all the components from the design system
 * Use this as a reference for implementing the design system in your pages
 */
const DesignSystemShowcase = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [activeFilter, setActiveFilter] = useState('all');
  const [toggleEnabled, setToggleEnabled] = useState(false);
  const [layerActive, setLayerActive] = useState(true);

  return (
    <div className="min-h-screen p-8 space-y-12">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-neutral-800 mb-2">
          Design System Showcase
        </h1>
        <p className="text-lg text-neutral-600">
          Modern, soft, and classy components based on EVERYWHERE brand colors
        </p>
      </div>

      {/* Color Palette */}
      <section className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold text-neutral-800 mb-6">Color Palette</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {/* Primary */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-700 mb-3">Primary (Teal)</h3>
            <div className="space-y-2">
              <div className="h-12 rounded-lg bg-primary-500 flex items-center justify-center text-white text-sm font-medium">
                #0d9fc1
              </div>
              <div className="h-8 rounded bg-primary-100"></div>
              <div className="h-8 rounded bg-primary-300"></div>
              <div className="h-8 rounded bg-primary-700"></div>
            </div>
          </div>

          {/* Secondary */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-700 mb-3">Secondary (Green)</h3>
            <div className="space-y-2">
              <div className="h-12 rounded-lg bg-secondary-500 flex items-center justify-center text-white text-sm font-medium">
                #00853e
              </div>
              <div className="h-8 rounded bg-secondary-100"></div>
              <div className="h-8 rounded bg-secondary-300"></div>
              <div className="h-8 rounded bg-secondary-700"></div>
            </div>
          </div>

          {/* Accent */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-700 mb-3">Accent (Orange)</h3>
            <div className="space-y-2">
              <div className="h-12 rounded-lg bg-accent-500 flex items-center justify-center text-white text-sm font-medium">
                #f58021
              </div>
              <div className="h-8 rounded bg-accent-100"></div>
              <div className="h-8 rounded bg-accent-300"></div>
              <div className="h-8 rounded bg-accent-700"></div>
            </div>
          </div>

          {/* Danger */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-700 mb-3">Danger (Red)</h3>
            <div className="space-y-2">
              <div className="h-12 rounded-lg bg-danger-500 flex items-center justify-center text-white text-sm font-medium">
                #de1c24
              </div>
              <div className="h-8 rounded bg-danger-100"></div>
              <div className="h-8 rounded bg-danger-300"></div>
              <div className="h-8 rounded bg-danger-700"></div>
            </div>
          </div>

          {/* Neutral */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-700 mb-3">Neutral (Gray)</h3>
            <div className="space-y-2">
              <div className="h-12 rounded-lg bg-neutral-500 flex items-center justify-center text-white text-sm font-medium">
                #7e8c9a
              </div>
              <div className="h-8 rounded bg-neutral-100"></div>
              <div className="h-8 rounded bg-neutral-300"></div>
              <div className="h-8 rounded bg-neutral-700"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Buttons */}
      <section className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold text-neutral-800 mb-6">Buttons</h2>
        
        <div className="space-y-8">
          {/* Solid Buttons */}
          <div>
            <h3 className="text-lg font-semibold text-neutral-700 mb-4">Solid Variants</h3>
            <div className="flex flex-wrap gap-4">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="success">Success</Button>
              <Button variant="warning">Warning</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="accent">Accent</Button>
            </div>
          </div>

          {/* Outline Buttons */}
          <div>
            <h3 className="text-lg font-semibold text-neutral-700 mb-4">Outline Variants</h3>
            <div className="flex flex-wrap gap-4">
              <Button variant="outline-primary">Outline Primary</Button>
              <Button variant="outline-secondary">Outline Secondary</Button>
            </div>
          </div>

          {/* Ghost Buttons */}
          <div>
            <h3 className="text-lg font-semibold text-neutral-700 mb-4">Ghost Variants</h3>
            <div className="flex flex-wrap gap-4">
              <Button variant="ghost">Ghost</Button>
              <Button variant="ghost-primary">Ghost Primary</Button>
            </div>
          </div>

          {/* Buttons with Icons */}
          <div>
            <h3 className="text-lg font-semibold text-neutral-700 mb-4">With Icons</h3>
            <div className="flex flex-wrap gap-4">
              <Button variant="primary" leftIcon={<Save size={16} />}>
                Save Changes
              </Button>
              <Button variant="secondary" leftIcon={<X size={16} />}>
                Cancel
              </Button>
              <Button variant="success" leftIcon={<Check size={16} />}>
                Approve
              </Button>
              <Button variant="danger" leftIcon={<Trash2 size={16} />}>
                Delete
              </Button>
            </div>
          </div>

          {/* Button Sizes */}
          <div>
            <h3 className="text-lg font-semibold text-neutral-700 mb-4">Sizes</h3>
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="primary" size="sm">Small</Button>
              <Button variant="primary">Default</Button>
              <Button variant="primary" size="lg">Large</Button>
              <Button variant="primary" size="icon">
                <Plus size={16} />
              </Button>
            </div>
          </div>

          {/* Button States */}
          <div>
            <h3 className="text-lg font-semibold text-neutral-700 mb-4">States</h3>
            <div className="flex flex-wrap gap-4">
              <Button variant="primary" loading>Loading...</Button>
              <Button variant="primary" disabled>Disabled</Button>
            </div>
          </div>
        </div>
      </section>

      {/* Badges */}
      <section className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold text-neutral-800 mb-6">Badges</h2>
        <div className="flex flex-wrap gap-3">
          <Badge variant="primary">Primary</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="danger">Danger</Badge>
          <Badge variant="accent">Accent</Badge>
          <Badge variant="neutral">Neutral</Badge>
        </div>
        <div className="flex flex-wrap gap-3 mt-4">
          <Badge variant="success" icon={<Check size={12} />}>Active</Badge>
          <Badge variant="warning" icon={<AlertCircle size={12} />}>Pending</Badge>
          <Badge variant="danger" icon={<X size={12} />}>Failed</Badge>
        </div>
      </section>

      {/* Cards */}
      <section className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold text-neutral-800 mb-6">Cards</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Basic Card */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Card</CardTitle>
            </CardHeader>
            <CardBody>
              <p className="text-neutral-600">
                This is a basic card with header, body, and footer sections.
              </p>
            </CardBody>
            <CardFooter>
              <Button variant="secondary" size="sm">Cancel</Button>
              <Button variant="primary" size="sm">Save</Button>
            </CardFooter>
          </Card>

          {/* Hover Card */}
          <Card hover>
            <CardHeader>
              <CardTitle>Hover Card</CardTitle>
            </CardHeader>
            <CardBody>
              <p className="text-neutral-600">
                Hover over this card to see the lift effect.
              </p>
            </CardBody>
          </Card>

          {/* Interactive Card */}
          <Card interactive onClick={() => alert('Card clicked!')}>
            <CardHeader>
              <CardTitle>Interactive Card</CardTitle>
            </CardHeader>
            <CardBody>
              <p className="text-neutral-600">
                This card is clickable and has a scale animation.
              </p>
            </CardBody>
          </Card>
        </div>
      </section>

      {/* Tabs */}
      <section className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold text-neutral-800 mb-6">Tabs</h2>
        
        <div className="space-y-8">
          {/* Pill Tabs */}
          <div>
            <h3 className="text-lg font-semibold text-neutral-700 mb-4">Pill Tabs</h3>
            <TabContainer variant="pill">
              <Tab 
                variant="pill"
                active={activeTab === 'overview'} 
                onClick={() => setActiveTab('overview')}
              >
                Overview
              </Tab>
              <Tab 
                variant="pill"
                active={activeTab === 'details'} 
                onClick={() => setActiveTab('details')}
              >
                Details
              </Tab>
              <Tab 
                variant="pill"
                active={activeTab === 'settings'} 
                onClick={() => setActiveTab('settings')}
              >
                Settings
              </Tab>
            </TabContainer>
          </div>

          {/* Underline Tabs */}
          <div>
            <h3 className="text-lg font-semibold text-neutral-700 mb-4">Underline Tabs</h3>
            <TabContainer variant="underline">
              <Tab 
                variant="underline"
                active={activeTab === 'overview'} 
                onClick={() => setActiveTab('overview')}
              >
                Overview
              </Tab>
              <Tab 
                variant="underline"
                active={activeTab === 'details'} 
                onClick={() => setActiveTab('details')}
              >
                Details
              </Tab>
              <Tab 
                variant="underline"
                active={activeTab === 'settings'} 
                onClick={() => setActiveTab('settings')}
              >
                Settings
              </Tab>
            </TabContainer>
          </div>
        </div>
      </section>

      {/* Filter Chips */}
      <section className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold text-neutral-800 mb-6">Filter Chips</h2>
        <div className="flex flex-wrap gap-3">
          <FilterChip 
            active={activeFilter === 'all'} 
            onClick={() => setActiveFilter('all')}
          >
            All Items
          </FilterChip>
          <FilterChip 
            active={activeFilter === 'active'} 
            onClick={() => setActiveFilter('active')}
          >
            Active
          </FilterChip>
          <FilterChip 
            active={activeFilter === 'pending'} 
            onClick={() => setActiveFilter('pending')}
          >
            Pending
          </FilterChip>
          <FilterChip 
            icon={<Filter size={14} />}
            active={activeFilter === 'filtered'} 
            onClick={() => setActiveFilter('filtered')}
          >
            Filtered
          </FilterChip>
          <FilterChip 
            active
            removable
            onRemove={() => alert('Filter removed')}
          >
            Removable Filter
          </FilterChip>
        </div>
      </section>

      {/* Forms */}
      <section className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold text-neutral-800 mb-6">Form Elements</h2>
        <Card>
          <CardBody>
            <div className="space-y-6 max-w-2xl">
              <Input 
                label="Email Address"
                type="email"
                placeholder="Enter your email"
                helper="We'll never share your email"
              />
              
              <Input 
                label="Search"
                leftIcon={<Search size={16} />}
                placeholder="Search..."
              />
              
              <Input 
                label="Password"
                type="password"
                error="Password must be at least 8 characters"
              />

              <ToggleSwitch 
                checked={toggleEnabled}
                onChange={setToggleEnabled}
                label="Enable notifications"
              />
            </div>
          </CardBody>
        </Card>
      </section>

      {/* Layer Panel */}
      <section className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold text-neutral-800 mb-6">Layer Panel</h2>
        <div className="max-w-sm">
          <LayerPanel title="Map Layers" icon={<Layers size={16} />}>
            <LayerItem 
              active={layerActive}
              icon={layerActive ? <Check size={16} /> : <div className="w-4 h-4" />}
              onClick={() => setLayerActive(!layerActive)}
            >
              <span>People Groups Layer</span>
            </LayerItem>
            <LayerItem 
              icon={<Map size={16} />}
            >
              <span>Villages Layer</span>
            </LayerItem>
            <LayerItem 
              icon={<Settings size={16} />}
            >
              <span>Voronoi Diagram</span>
            </LayerItem>
          </LayerPanel>
        </div>
      </section>

      {/* Common Patterns */}
      <section className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold text-neutral-800 mb-6">Common Patterns</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Status Indicator */}
          <Card>
            <CardHeader>
              <CardTitle>Status Indicators</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-success-500" />
                  <span className="text-sm text-neutral-600">Active</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-warning-500" />
                  <span className="text-sm text-neutral-600">Pending</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-danger-500" />
                  <span className="text-sm text-neutral-600">Failed</span>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Info Card with Icon */}
          <Card>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                <Info size={20} className="text-primary-600" />
              </div>
              <div>
                <h4 className="font-semibold text-neutral-800 mb-1">Information</h4>
                <p className="text-sm text-neutral-600">
                  This is an informational card with an icon and description.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default DesignSystemShowcase;
