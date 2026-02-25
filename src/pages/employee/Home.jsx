import { NavigationBar } from '../../components/NavigationBar';
import { notionClasses } from '@/lib/notion-theme';

export default function EmployeeHome() {
  return (
    <div className={notionClasses.pageContainer}>
      <NavigationBar />
      <div className={notionClasses.dashboardContainer}>
        <div className="mb-8">
          <h1 className={notionClasses.header.title}>Employee Dashboard</h1>
          <p className={notionClasses.header.subtitle}>View and manage your assigned jobs.</p>
        </div>
        
        <div className={`${notionClasses.card} mb-8`}>
           <p className="text-[#37352F]">Welcome to the Employee Dashboard. Content will go here.</p>
        </div>
      </div>
    </div>
  );
}
