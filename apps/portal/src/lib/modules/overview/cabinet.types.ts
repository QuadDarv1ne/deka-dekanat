import type { cabinetProfile } from './server/cabinet-profile.service.server.ts';
import type { cabinetSection } from './server/cabinet-section.service.server.ts';

export type CabinetProfileData = Awaited<ReturnType<typeof cabinetProfile>>;
export type CabinetSectionData = Awaited<ReturnType<typeof cabinetSection>>;
