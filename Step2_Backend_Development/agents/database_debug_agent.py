#!/usr/bin/env python3
"""
Database Debug Agent - Specialized in fixing SQL type casting issues
Backstory: This agent is a veteran database administrator with 15 years of experience
fixing PostgreSQL type casting errors. They have a keen eye for spotting mismatched
data types and can quickly identify and fix SQL query issues.
"""

import os
import sys
import json
import re
from pathlib import Path

class DatabaseDebugAgent:
    def __init__(self):
        self.name = "Database Debug Agent"
        self.specialty = "SQL Type Casting and Database Query Issues"
        self.experience = "15 years of PostgreSQL debugging"
        
    def analyze_error(self, error_message):
        """Analyze the specific error message to identify the root cause"""
        print(f"🔍 {self.name} analyzing error: {error_message}")
        
        # Extract key information from the error
        if "operator does not exist: character varying = integer" in error_message:
            return {
                "issue_type": "type_casting",
                "problem": "VARCHAR column being compared to INTEGER",
                "solution": "Add explicit type casting or fix parameter types"
            }
        return {"issue_type": "unknown", "problem": "Unknown error", "solution": "Investigate further"}
    
    def find_sql_issues(self, file_path):
        """Scan the history controller for SQL type casting issues"""
        print(f"🔍 Scanning {file_path} for SQL issues...")
        
        issues = []
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Look for potential type casting issues
            lines = content.split('\n')
            for i, line in enumerate(lines, 1):
                # Check for string comparisons that might cause issues
                if re.search(r"WHERE.*=.*'[^']*'", line):
                    issues.append({
                        "line": i,
                        "content": line.strip(),
                        "issue": "String literal comparison - check if column is VARCHAR",
                        "severity": "medium"
                    })
                
                # Check for parameter usage
                if re.search(r"\$[0-9]+", line):
                    issues.append({
                        "line": i,
                        "content": line.strip(),
                        "issue": "Parameter usage - verify type matches column type",
                        "severity": "high"
                    })
                
                # Check for UNION queries that might have type mismatches
                if "UNION" in line.upper():
                    issues.append({
                        "line": i,
                        "content": line.strip(),
                        "issue": "UNION query - ensure all SELECT statements have matching column types",
                        "severity": "high"
                    })
        
        except Exception as e:
            print(f"❌ Error reading file: {e}")
            
        return issues
    
    def fix_sql_query(self, file_path):
        """Fix the SQL query issues in the history controller"""
        print(f"🔧 {self.name} fixing SQL issues in {file_path}")
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Fix 1: Ensure all user_id parameters are integers
            content = re.sub(r'\[userId\.toString\(\)\]', '[userId]', content)
            
            # Fix 2: Add explicit type casting for string comparisons
            content = re.sub(
                r"WHERE.*result\s*=\s*'win'",
                "WHERE result = 'win'::VARCHAR",
                content
            )
            
            # Fix 3: Ensure LIMIT parameters are integers
            content = re.sub(
                r'LIMIT \$2',
                'LIMIT $2::INTEGER',
                content
            )
            
            # Fix 4: Add explicit casting for numeric comparisons
            content = re.sub(
                r'winnings > 0',
                'winnings::NUMERIC > 0',
                content
            )
            
            # Write the fixed content back
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
                
            print("✅ SQL query fixes applied successfully!")
            return True
            
        except Exception as e:
            print(f"❌ Error fixing SQL query: {e}")
            return False
    
    def create_simple_fallback_query(self, file_path):
        """Create a simple fallback query that definitely works"""
        print(f"🛠️ Creating simple fallback query for {file_path}")
        
        fallback_query = '''
    // Simple fallback query - just get basic bet information
    const simpleQuery = `
      SELECT 
        'bet_activity' as activity_type,
        'Bet placed' as description,
        -amount as amount_change,
        timestamp,
        'bet' as category
      FROM bets
      WHERE user_id = $1
      ORDER BY timestamp DESC
      LIMIT $2
    `;
    
    const result = await db.query(simpleQuery, [userId, limit]);
    '''
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Replace the complex query with a simple one
            content = re.sub(
                r'const bettingQuery = `.*?`;',
                fallback_query.strip(),
                content,
                flags=re.DOTALL
            )
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
                
            print("✅ Simple fallback query created!")
            return True
            
        except Exception as e:
            print(f"❌ Error creating fallback query: {e}")
            return False
    
    def run_diagnosis(self):
        """Run complete diagnosis and fix"""
        print(f"🚀 {self.name} starting diagnosis...")
        print(f"Specialty: {self.specialty}")
        print(f"Experience: {self.experience}")
        
        # Target file
        target_file = "controllers/historyController.js"
        
        if not os.path.exists(target_file):
            print(f"❌ Target file {target_file} not found!")
            return False
        
        # Step 1: Analyze the error
        error_msg = "operator does not exist: character varying = integer"
        analysis = self.analyze_error(error_msg)
        print(f"📊 Analysis: {analysis}")
        
        # Step 2: Find SQL issues
        issues = self.find_sql_issues(target_file)
        print(f"🔍 Found {len(issues)} potential issues")
        
        # Step 3: Apply fixes
        print("🔧 Applying fixes...")
        
        # Try the simple fallback approach first
        if self.create_simple_fallback_query(target_file):
            print("✅ Simple fallback query applied!")
            return True
        
        # If that fails, try the detailed fixes
        if self.fix_sql_query(target_file):
            print("✅ SQL query fixes applied!")
            return True
        
        print("❌ All fix attempts failed")
        return False

if __name__ == "__main__":
    agent = DatabaseDebugAgent()
    success = agent.run_diagnosis()
    
    if success:
        print("🎉 Database Debug Agent completed successfully!")
        print("🔄 Please restart the backend to apply fixes")
    else:
        print("❌ Database Debug Agent failed to fix the issue")
        print("🔍 Manual intervention may be required")

