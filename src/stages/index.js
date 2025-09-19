const LOCALE = 'fr-FR'

window.addEventListener('onWidgetLoad', async (obj) => {
  const status = await SE_API.getOverlayStatus();
  const fieldData = obj.detail.fieldData;

  const projectId = fieldData["projectNumericalId"];
  const percentageMode = fieldData["percentageMode"];
  const refreshInterval = fieldData["refreshInterval"] * 1000 || 10000;
  const suffix = fieldData["usedSuffix"] ? fieldData["currency"] : fieldData["presaleSuffix"];

  if (!projectId) {
    console.error(`[/v1/projects/] Expected a valid project ID, got ${projectId} instead`);
    if (status.isEditorMode) {
      $('.stages-amount').html(`<div>Please input a valid project ID</div>`);
    }
    return
  };
  console.log('[/v1/projects/] Widget loaded for project', projectId);

  let amount;
  let currentStage;
  let previousStage;
  const url = `https://api.ulule.com/v1/projects/${projectId}?extra_fields=stages`;

  fetchStats();
  setInterval(async () => {
    fetchStats();
  }, refreshInterval);

  async function fetchStats() {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`[v1/projects/${projectId}?extra_fields=stages] Response status: ${response.status}`);
      }
      const {
        stages,
        committed,
        goal,
        goal_raised: goalRaised
      } = await response.json();

      if (!goalRaised) {
        $('.stages-amount').html(`<div>Goal not reached</div>`);
        return;
      }

      if (stages) {
        stages.forEach((element, index) => {
          if (element.status == "ongoing") {
            if(percentageMode && index > 0){
              previousStage = stages[index-1];
            }
            currentStage = element;
            console.log(previousStage);
            console.log(currentStage);
          }
        });
        if (!currentStage) {
          $('.stages-amount').html(`<div>Project has no ongoing stage</div>`);
          return;
        }
        
      } else {
        $('.stages-amount').html(`<div>Project has no stages</div>`);
        return;
      }

      $({ amount: amount }).animate({ amount: committed }, {
        duration: 3000,
        easing: 'swing',
        step: function () {
          const goalElement = goal > 0 ? `<span class="stages-amount__goal"> / ${currentStage.goal.toLocaleString(LOCALE)} ${suffix}<span></div>` : '';
          $('.stages-amount').html(`<div>${Math.round(this.amount).toLocaleString(LOCALE)} ${goalElement}`);
          $('.stages-title').html(`<div>${currentStage.title.fr}`);
        }
      });
      amount = committed;

      if (goal > 0) {
        let progress;
        if(percentageMode && previousStage){
          progress =Math.floor((committed-previousStage.goal) / (currentStage.goal-previousStage.goal) * 100);
        } else {
          progress =Math.floor(committed / currentStage.goal * 100);
        }
        $(".stages-progress-bar").show();
        $(".stages-progress-bar__content").animate({
          width: `${progress > 100 ? 100 : progress}%`,
        }, 1000);
        $(".stages-progress-bar__content").text(`${progress}%`);
      }
    } catch (error) {
      console.error(`[v1/projects/${projectId}?extra_fields=stages] Failed to fetch project`, error.message);
    }
  }
});
