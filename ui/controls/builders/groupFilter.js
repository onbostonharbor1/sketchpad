/* controls/builders/groupFilter.js
   ============================================================
   GROUP FILTER
   ============================================================ */

/**
 * filterControlsByActiveGroups(controlItems, sourceInfo)
 * -----------------------------------------------------------
 * GROUP VISIBILITY FILTER
 * 
 * ENVIRONMENT:
 * ------------
 * Used by both buildDrawParameterData and buildScriptParameterData
 * 
 * PURPOSE:
 * --------
 * Implements conditional control visibility based on group membership.
 * 
 * GROUPING MECHANISM:
 * ------------------
 * 1. Controls can declare: belongsToGroup: "groupName"
 * 2. Select/radio controls can declare: showsGroup: true
 * 3. When a showsGroup control has value "foo", only controls with
 *    belongsToGroup: "foo" are visible (plus ungrouped controls)
 * 4. Controls without belongsToGroup are always visible
 * 
 * PARAMETERS:
 * ----------
 * - controlItems: Array of normalized control objects with key/widget/value
 * - sourceInfo: The script or tab state containing parameters/controls
 * 
 * RETURNS:
 * -------
 * Filtered array of control items that should be visible
 */
export function filterControlsByActiveGroups(controlItems, sourceInfo) {
  // Get the schema (controls definitions)
  const schema = sourceInfo.controls || sourceInfo.drawRegistry?.controls || {};
  
  // Find all controls that trigger group visibility
  const groupTriggers = {};
  for (const key in schema) {
    const def = schema[key];
    if (def.showsGroup === true) {
      // Get the current value of this trigger control
      const currentValue = sourceInfo.parameters?.[key] ?? def.default;
      groupTriggers[key] = currentValue;
    }
  }
  
  // If no group triggers exist, return all controls
  if (Object.keys(groupTriggers).length === 0) {
    return controlItems;
  }
  
  // Get the set of active group names
  const activeGroups = new Set(Object.values(groupTriggers));
  
  // Filter controls based on group membership
  return controlItems.filter(item => {
    const def = schema[item.key];
    
    // Controls without belongsToGroup are always visible
    if (!def.belongsToGroup) return true;
    
    // Controls with belongsToGroup are only visible if their group is active
    return activeGroups.has(def.belongsToGroup);
  });
} // end filterControlsByActiveGroups
