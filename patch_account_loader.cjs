const fs = require('fs');
let code = fs.readFileSync('pages/Account.tsx', 'utf8');

const listTarget = `                <div className="space-y-6">
                  {filteredPurchasedCourses.map((pc) => {`;
const listNew = `                <div className="space-y-6">
                  {showSkeleton ? (
                    [1, 2, 3].map((i) => (
                      <div key={i} className="bg-white rounded-3xl p-5 md:p-6 border border-gray-100 flex flex-col md:flex-row gap-6 shadow-sm">
                        <div className="w-full md:w-48 h-32 md:h-full bg-gray-200 rounded-2xl shrink-0 animate-pulse"></div>
                        <div className="flex-1 flex flex-col space-y-4 py-2">
                          <div className="h-6 w-3/4 bg-gray-200 rounded-md animate-pulse"></div>
                          <div className="h-4 w-1/2 bg-gray-200 rounded-md animate-pulse mt-2"></div>
                          <div className="mt-auto pt-4 space-y-2">
                            <div className="flex justify-between">
                              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                              <div className="h-4 w-12 bg-gray-200 rounded animate-pulse"></div>
                            </div>
                            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden"></div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : filteredPurchasedCourses.map((pc) => {`;
code = code.replace(listTarget, listNew);

fs.writeFileSync('pages/Account.tsx', code);
